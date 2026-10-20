-- 웹푸시 기기 저장: 이미 있는 기기 주소(endpoint)의 주인은 그 기기 키(p256dh·auth)를 함께 낸 경우에만 바꾼다.
-- 공용 폰에서 다음 사람이 로그인하면 같은 브라우저가 같은 키를 내므로 주인이 바뀐다.
-- 주소만 알아낸 다른 사람이 남의 기기를 가로채거나 키를 덮어쓰지 못하게 한다.

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_p256dh text;
  v_auth text;
begin
  if (select auth.uid()) is null or private.my_role() is null then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200
     or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'invalid-subscription' using errcode = '22023';
  end if;

  select s.worker_id, s.p256dh, s.auth into v_owner, v_p256dh, v_auth
  from public.push_subscriptions s where s.endpoint = p_endpoint for update;

  if v_owner is null then
    insert into public.push_subscriptions (worker_id, endpoint, p256dh, auth)
    values ((select auth.uid()), p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do nothing;
  elsif v_owner = (select auth.uid()) then
    update public.push_subscriptions set p256dh = p_p256dh, auth = p_auth where endpoint = p_endpoint;
  elsif v_p256dh = p_p256dh and v_auth = p_auth then
    update public.push_subscriptions set worker_id = (select auth.uid()), created_at = now() where endpoint = p_endpoint;
  else
    raise exception 'not-allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
