-- 대상자 관리 보완 (코드리뷰)
-- 1) 동 칸에는 행정동 이름만: 앱에서 동 담당자가 입력하므로 주소·전화번호·이름을 섞어 넣지 못하게 한다.
--    이 값은 여러 기관 화면과 AI 요청에 함께 나간다. 규칙은 src/schemas/client.ts의 DONG_PATTERN과 같다.
-- 2) 자동 번호: 가장 큰 번호 + 1이 9999를 넘으면 빈 번호 중 가장 작은 것을 붙인다 (넘치면 등록이 계속 실패했다).

alter table public.clients add constraint clients_dong_format
  check (dong ~ '^([가-힣○]{1,8}(시|구|군) ){0,2}[가-힣○0-9·]{1,12}(동|읍|면|가)$');

create or replace function public.register_client(p_code text, p_age_band smallint, p_dong text, p_partner_ids uuid[])
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_agency uuid := private.my_agency_id();
  v_code text := nullif(trim(p_code), '');
  v_dong text := trim(p_dong);
  v_next int;
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
    select coalesce(max(substring(c from 3)::int), 0) + 1 into v_next
    from (select code as c from public.clients union all select old_code from public.client_code_history) all_codes;
    if v_next > 9999 then
      -- 9999를 넘으면 한 번도 쓰지 않은 번호 중 가장 작은 것
      select min(n) into v_next
      from generate_series(1, 9999) as n
      where not private.code_taken('C-' || lpad(n::text, 4, '0'), null);
      if v_next is null then
        raise exception 'codes-exhausted' using errcode = '22023';
      end if;
    end if;
    v_code := 'C-' || lpad(v_next::text, 4, '0');
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
