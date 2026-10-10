-- 무료 요금제 일시정지(7일 동안 사용이 적으면) 방지: Vercel 크론이 하루 한 번 public.keepalive()를 부른다.
-- 개인정보를 읽거나 돌려주지 않고, 한 행짜리 시각만 갱신한다. private 스키마는 Data API에 노출되지 않는다.

create table private.keepalive (
  id smallint primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now()
);
insert into private.keepalive default values;

create function public.keepalive() returns timestamptz
language sql volatile security definer set search_path = ''
as $$
  update private.keepalive set pinged_at = now() where id = 1 returning pinged_at;
$$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
