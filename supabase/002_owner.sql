-- 카카오 열쇠 보관용 열 추가. SQL Editor에 붙여 넣고 한 번 실행한다.
alter table labs add column if not exists owner text;  -- 열쇠를 보관한 카카오 회원번호
create index if not exists labs_owner on labs(owner);
