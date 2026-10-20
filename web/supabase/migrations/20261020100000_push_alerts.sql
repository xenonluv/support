-- 관리자 → 현장인력 웹푸시 알림 (doc/알람계획.md 간단 버전)
-- 관리자가 대상자 화면에서 누르면, 그 대상자와 연결된 모든 기관의 현장인력 기기로 "확인 필요" 알림을 보낸다.
-- 받는 범위는 현장인력이 이미 읽는 범위(can_see_client)와 같다. 비밀 키 없이 아래 함수 안에서 권한을 판단한다.
-- 오류 코드: 42501 권한 없음, 22023 입력 오류, P0001 too-soon(1분 안에 다시 보냄)

-- 알림 받을 기기. 한 사람이 여러 기기를 가질 수 있다. endpoint·키는 푸시 서비스 주소일 뿐 개인정보가 아니다
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_worker_id_idx on public.push_subscriptions (worker_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
-- 본인 기기만 보고 지운다. 저장은 save_push_subscription으로만 한다
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
using (worker_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
using (worker_id = (select auth.uid()));

-- 보낸 기록. 쓰기는 아래 함수로만 한다
create table public.push_alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  sender_id uuid references public.workers (id) on delete set null,
  recipient_count int not null default 0,
  device_count int not null default 0,
  delivered_count int,
  created_at timestamptz not null default now()
);
create index push_alerts_client_id_idx on public.push_alerts (client_id, created_at desc);

alter table public.push_alerts enable row level security;
revoke all on public.push_alerts from anon;
create policy push_alerts_select on public.push_alerts for select to authenticated
using ((select private.my_role()) = 'manager' and private.can_see_client(client_id));

-- ───────────────────────── 함수 ─────────────────────────

-- 이 기기를 내 알림 기기로 저장한다. 같은 기기를 다른 계정이 쓰던 경우(공용 폰) 주인을 나로 바꾼다
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.my_role() is null then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200
     or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'invalid-subscription' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (worker_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set worker_id = excluded.worker_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

-- 관리자가 대상자 알림을 시작한다: 보낸 기록을 만들고 받을 기기 목록을 돌려준다(첫 행에 alert_id)
create function public.send_client_alert(p_client_id uuid)
returns table (alert_id uuid, subscription_id uuid, endpoint text, p256dh text, auth text)
language plpgsql volatile security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_alert uuid;
  v_closed timestamptz;
  v_recipients int;
  v_devices int;
begin
  if private.my_role() is distinct from 'manager' or not private.can_see_client(p_client_id) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  -- 같은 대상자에 동시에 누른 경우를 줄 세운다
  select c.closed_at into v_closed from public.clients c where c.id = p_client_id for update;
  if v_closed is not null then
    raise exception 'client-closed' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.push_alerts a
    where a.client_id = p_client_id and a.created_at > now() - interval '1 minute'
  ) then
    raise exception 'too-soon';
  end if;

  select count(distinct w.id), count(s.id) into v_recipients, v_devices
  from public.workers w
  join public.client_agencies ca on ca.agency_id = w.agency_id and ca.client_id = p_client_id
  left join public.push_subscriptions s on s.worker_id = w.id
  where w.role = 'worker';

  insert into public.push_alerts (client_id, sender_id, recipient_count, device_count)
  values (p_client_id, (select auth.uid()), v_recipients, v_devices)
  returning id into v_alert;

  return query
  select v_alert, s.id, s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  join public.workers w on w.id = s.worker_id and w.role = 'worker'
  join public.client_agencies ca on ca.agency_id = w.agency_id and ca.client_id = p_client_id;
  -- 기기가 하나도 없어도 보낸 기록 id는 돌려준다
  if not found then
    return query select v_alert, null::uuid, null::text, null::text, null::text;
  end if;
end;
$$;

-- 보낸 사람이 결과를 적는다: 도착 수, 만료된 기기(푸시 서비스가 404/410) 삭제
create function public.finish_client_alert(p_alert_id uuid, p_delivered int, p_expired uuid[])
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_client uuid;
begin
  select a.client_id into v_client from public.push_alerts a
  where a.id = p_alert_id and a.sender_id = (select auth.uid()) and a.delivered_count is null;
  if v_client is null then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  update public.push_alerts set delivered_count = greatest(p_delivered, 0) where id = p_alert_id;
  -- 이 알림의 받는 사람 기기만 지울 수 있다
  delete from public.push_subscriptions s
  using public.workers w, public.client_agencies ca
  where s.id = any (coalesce(p_expired, '{}'))
    and w.id = s.worker_id and w.role = 'worker'
    and ca.agency_id = w.agency_id and ca.client_id = v_client;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text) from public, anon;
revoke all on function public.send_client_alert(uuid) from public, anon;
revoke all on function public.finish_client_alert(uuid, int, uuid[]) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.send_client_alert(uuid) to authenticated;
grant execute on function public.finish_client_alert(uuid, int, uuid[]) to authenticated;
