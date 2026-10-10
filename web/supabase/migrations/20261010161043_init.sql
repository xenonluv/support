-- 돌봄이음 1차 스키마 (5단계)
-- 개인정보 원칙: 대상자 성명·주소·연락처 컬럼을 두지 않는다. 음성은 저장하지 않는다.
-- 권한은 RLS가 판단한다: 대상자는 client_agencies로 내 기관과 연결된 경우에만 보인다.

-- ───────────────────────── 테이블 ─────────────────────────

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('dong_center', 'provider', 'welfare_center')),
  created_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id),
  role text not null check (role in ('worker', 'manager')),
  display_name text not null,
  created_at timestamptz not null default now()
);
create index workers_agency_id_idx on public.workers (agency_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- 식별번호 (예: C-0012)
  age_band smallint check (age_band between 50 and 100 and age_band % 10 = 0), -- 연령대 시작값
  dong text not null, -- 행정동 (예: 서구 화정1동)
  created_at timestamptz not null default now()
);

create table public.client_agencies (
  client_id uuid not null references public.clients (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  primary key (client_id, agency_id)
);
create index client_agencies_agency_id_idx on public.client_agencies (agency_id);

create table public.visit_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  worker_id uuid not null references public.workers (id),
  agency_id uuid not null references public.agencies (id),
  visited_at timestamptz not null default now(),
  transcript_text text, -- 마스킹을 거친 구술 글자만 저장 (6단계)
  draft_json jsonb,
  final_json jsonb,
  edited boolean not null default false,
  edit_ratio real check (edit_ratio between 0 and 1),
  input_mode text not null check (input_mode in ('voice', 'text')),
  stt_engine text,
  duration_ms integer check (duration_ms >= 0), -- 녹음 시작~저장 소요 시간
  created_at timestamptz not null default now()
);
create index visit_records_client_visited_idx on public.visit_records (client_id, visited_at desc);
create index visit_records_worker_id_idx on public.visit_records (worker_id);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.visit_records (id) on delete cascade,
  client_id uuid not null references public.clients (id),
  type text not null check (
    type in ('missed_medication', 'reduced_meal', 'fall', 'emotional_withdrawal', 'visit_refusal')
  ),
  level text not null check (level in ('observe', 'caution')),
  evidence_quote text not null, -- 근거 문장 인용
  status text not null default 'unchecked' check (status in ('unchecked', 'checked', 'acting', 'resolved')),
  first_seen_at timestamptz not null default now(),
  resolved_by uuid references public.workers (id),
  resolved_at timestamptz,
  outcome text, -- 예: linked(연계됨) — '이번 달 조기 발견' 집계용
  created_at timestamptz not null default now()
);
create index flags_client_status_idx on public.flags (client_id, status);
create index flags_record_id_idx on public.flags (record_id);

create table public.alert_drafts (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.flags (id) on delete cascade,
  target text not null check (target in ('dong_manager', 'linked_agency')),
  body text not null,
  copied_at timestamptz,
  created_at timestamptz not null default now()
);
create index alert_drafts_flag_id_idx on public.alert_drafts (flag_id);

create table public.briefings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  period_from date not null,
  period_to date not null check (period_to >= period_from),
  body text not null,
  created_by uuid not null references public.workers (id),
  created_at timestamptz not null default now()
);
create index briefings_client_id_idx on public.briefings (client_id);

-- ───────────────────────── 권한 판단 함수 ─────────────────────────
-- private 스키마는 Data API에 노출되지 않는다. security definer로 RLS 재귀를 피한다.

create schema if not exists private;

create function private.my_agency_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select agency_id from public.workers where id = (select auth.uid())
$$;

create function private.my_role() returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.workers where id = (select auth.uid())
$$;

create function private.can_see_client(target uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_agencies ca
    where ca.client_id = target and ca.agency_id = private.my_agency_id()
  )
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ───────────────────────── RLS ─────────────────────────

alter table public.agencies enable row level security;
alter table public.workers enable row level security;
alter table public.clients enable row level security;
alter table public.client_agencies enable row level security;
alter table public.visit_records enable row level security;
alter table public.flags enable row level security;
alter table public.alert_drafts enable row level security;
alter table public.briefings enable row level security;

-- 비로그인(anon)은 public 테이블에 아무 권한도 없다 (앞으로 만들 테이블도 마찬가지)
revoke all on all tables in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;

-- 기관: 내 기관, 그리고 내가 볼 수 있는 대상자를 함께 돌보는 기관
create policy agencies_select on public.agencies for select to authenticated
using (
  id = (select private.my_agency_id())
  or exists (
    select 1 from public.client_agencies ca
    where ca.agency_id = agencies.id and private.can_see_client(ca.client_id)
  )
);

-- 직원: 본인, 관리자는 같은 기관 직원
create policy workers_select on public.workers for select to authenticated
using (
  id = (select auth.uid())
  or ((select private.my_role()) = 'manager' and agency_id = (select private.my_agency_id()))
);

-- 대상자·연결: 내 기관과 연결된 대상자만
create policy clients_select on public.clients for select to authenticated
using (private.can_see_client(id));

create policy client_agencies_select on public.client_agencies for select to authenticated
using (private.can_see_client(client_id));

-- 방문 기록: 볼 수 있는 대상자의 기록은 조회(인수인계), 쓰기는 본인 기록만
create policy visit_records_select on public.visit_records for select to authenticated
using (private.can_see_client(client_id));

create policy visit_records_insert on public.visit_records for insert to authenticated
with check (
  worker_id = (select auth.uid())
  and agency_id = (select private.my_agency_id())
  and private.can_see_client(client_id)
);

create policy visit_records_update on public.visit_records for update to authenticated
using (worker_id = (select auth.uid()))
with check (worker_id = (select auth.uid()) and agency_id = (select private.my_agency_id()));

-- 이상징후: 조회는 볼 수 있는 대상자, 생성은 본인 기록에서, 상태 변경은 관리자
create policy flags_select on public.flags for select to authenticated
using (private.can_see_client(client_id));

create policy flags_insert on public.flags for insert to authenticated
with check (
  private.can_see_client(client_id)
  and exists (
    select 1 from public.visit_records r
    where r.id = record_id and r.worker_id = (select auth.uid()) and r.client_id = flags.client_id
  )
);

create policy flags_update on public.flags for update to authenticated
using (private.can_see_client(client_id) and (select private.my_role()) = 'manager')
with check (private.can_see_client(client_id));

-- 알림 문안: 해당 플래그를 볼 수 있으면 조회·생성·복사 기록
create policy alert_drafts_select on public.alert_drafts for select to authenticated
using (exists (select 1 from public.flags f where f.id = flag_id and private.can_see_client(f.client_id)));

create policy alert_drafts_insert on public.alert_drafts for insert to authenticated
with check (exists (select 1 from public.flags f where f.id = flag_id and private.can_see_client(f.client_id)));

create policy alert_drafts_update on public.alert_drafts for update to authenticated
using (exists (select 1 from public.flags f where f.id = flag_id and private.can_see_client(f.client_id)))
with check (exists (select 1 from public.flags f where f.id = flag_id and private.can_see_client(f.client_id)));

-- 브리핑: 볼 수 있는 대상자, 작성자는 본인
create policy briefings_select on public.briefings for select to authenticated
using (private.can_see_client(client_id));

create policy briefings_insert on public.briefings for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_see_client(client_id));
