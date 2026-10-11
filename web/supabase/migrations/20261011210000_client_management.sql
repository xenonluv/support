-- 대상자 관리: 동 담당자(동 행정복지센터 관리자)가 앱에서 대상자를 등록·수정·종결한다.
-- 쓰기는 아래 함수로만 한다 — 대상자 생성과 기관 연결을 한 번에 처리하고, 권한은 함수 안에서 판단한다.
-- clients·client_agencies에는 여전히 쓰기 정책이 없다. 성명·주소·연락처 컬럼은 만들지 않는다.

alter table public.clients add column closed_at timestamptz; -- 종결(서비스 종료·전출 등). 기록은 그대로 둔다
alter table public.clients add constraint clients_code_format check (code ~ '^C-[0-9]{4}$');

-- 식별번호 변경 이력: 기관 대응표·이미 복사한 글에 남은 옛 번호로도 대상자를 찾게 한다
create table public.client_code_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  old_code text not null,
  new_code text not null,
  changed_by uuid references public.workers (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index client_code_history_client_id_idx on public.client_code_history (client_id);
create index client_code_history_old_code_idx on public.client_code_history (old_code);

alter table public.client_code_history enable row level security;
revoke all on public.client_code_history from anon;
create policy client_code_history_select on public.client_code_history for select to authenticated
using (private.can_see_client(client_id));

-- ───────────────────────── 권한 판단 ─────────────────────────

-- 동 담당자: 관리자이고 소속 기관이 동 행정복지센터
create function private.is_dong_manager() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workers w join public.agencies a on a.id = w.agency_id
    where w.id = (select auth.uid()) and w.role = 'manager' and a.type = 'dong_center'
  )
$$;

-- 다른 대상자가 지금 쓰거나 예전에 쓴 번호인지 (번호는 다시 쓰지 않는다. 같은 대상자의 옛 번호로 되돌리는 것은 된다)
create function private.code_taken(p_code text, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.clients where code = p_code and id is distinct from p_client)
      or exists (select 1 from public.client_code_history where old_code = p_code and client_id is distinct from p_client)
$$;

revoke all on function private.is_dong_manager() from public;
revoke all on function private.code_taken(text, uuid) from public;
grant execute on function private.is_dong_manager() to authenticated;
grant execute on function private.code_taken(text, uuid) to authenticated;

-- ───────────────────────── 쓰기 함수 ─────────────────────────
-- 오류 코드: 42501 권한 없음, 23505 번호 중복, 22023 입력 오류 (앱이 문구로 바꾼다)

create function public.register_client(p_code text, p_age_band smallint, p_dong text, p_partner_ids uuid[])
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_agency uuid := private.my_agency_id();
  v_code text := nullif(trim(p_code), '');
  v_dong text := trim(p_dong);
  v_id uuid;
begin
  if not private.is_dong_manager() then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v_dong is null or char_length(v_dong) not between 2 and 40 then
    raise exception 'invalid-dong' using errcode = '22023';
  end if;
  if v_code is null then
    -- 다음 번호: 지금 쓰는 번호와 예전에 쓴 번호 중 가장 큰 숫자 + 1
    select 'C-' || lpad((coalesce(max(substring(c from 3)::int), 0) + 1)::text, 4, '0') into v_code
    from (select code as c from public.clients union all select old_code from public.client_code_history) all_codes;
  end if;
  if v_code !~ '^C-[0-9]{4}$' then
    raise exception 'invalid-code' using errcode = '22023';
  end if;
  if private.code_taken(v_code, null) then
    raise exception 'code-taken' using errcode = '23505';
  end if;

  insert into public.clients (code, age_band, dong) values (v_code, p_age_band, v_dong) returning id into v_id;
  insert into public.client_agencies (client_id, agency_id)
  select distinct v_id, a from unnest(array_append(coalesce(p_partner_ids, '{}'), v_agency)) as a;
  return v_code;
end;
$$;

create function public.update_client(p_client_id uuid, p_code text, p_age_band smallint, p_dong text, p_partner_ids uuid[])
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_agency uuid := private.my_agency_id();
  v_code text := trim(p_code);
  v_dong text := trim(p_dong);
  v_old text;
begin
  if not (private.is_dong_manager() and private.can_see_client(p_client_id)) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v_dong is null or char_length(v_dong) not between 2 and 40 then
    raise exception 'invalid-dong' using errcode = '22023';
  end if;
  if v_code is null or v_code !~ '^C-[0-9]{4}$' then
    raise exception 'invalid-code' using errcode = '22023';
  end if;

  select code into v_old from public.clients where id = p_client_id for update;
  if v_code <> v_old then
    if private.code_taken(v_code, p_client_id) then
      raise exception 'code-taken' using errcode = '23505';
    end if;
    insert into public.client_code_history (client_id, old_code, new_code, changed_by)
    values (p_client_id, v_old, v_code, (select auth.uid()));
  end if;
  update public.clients set code = v_code, age_band = p_age_band, dong = v_dong where id = p_client_id;

  -- 함께 돌볼 기관 동기화 (내 기관 연결은 그대로 둔다)
  delete from public.client_agencies
  where client_id = p_client_id and agency_id <> v_agency and agency_id <> all (coalesce(p_partner_ids, '{}'));
  insert into public.client_agencies (client_id, agency_id)
  select distinct p_client_id, a from unnest(coalesce(p_partner_ids, '{}')) as a
  on conflict do nothing;
end;
$$;

create function public.set_client_closed(p_client_id uuid, p_closed boolean)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not (private.is_dong_manager() and private.can_see_client(p_client_id)) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  update public.clients
  set closed_at = case when p_closed then coalesce(closed_at, now()) else null end
  where id = p_client_id;
end;
$$;

-- 함께 돌볼 기관 고르기용: 관리자에게 기관 이름·종류만 준다 (agencies 조회 정책은 넓히지 않는다)
create function public.list_agencies()
returns table (id uuid, name text, type text)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.name, a.type from public.agencies a
  where (select private.my_role()) = 'manager'
  order by a.type, a.name
$$;

revoke all on function public.register_client(text, smallint, text, uuid[]) from public, anon;
revoke all on function public.update_client(uuid, text, smallint, text, uuid[]) from public, anon;
revoke all on function public.set_client_closed(uuid, boolean) from public, anon;
revoke all on function public.list_agencies() from public, anon;
grant execute on function public.register_client(text, smallint, text, uuid[]) to authenticated;
grant execute on function public.update_client(uuid, text, smallint, text, uuid[]) to authenticated;
grant execute on function public.set_client_closed(uuid, boolean) to authenticated;
grant execute on function public.list_agencies() to authenticated;
