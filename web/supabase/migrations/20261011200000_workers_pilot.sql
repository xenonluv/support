-- 파일럿 참여자 표시(9단계): 성과지표는 파일럿 참여자의 기록만 센다(시험 계정·시연 데이터 제외).
-- workers에는 수정 정책이 없어 계정 발급 스크립트(비밀 키)만 바꿀 수 있다.
alter table public.workers add column pilot boolean not null default false;
