-- 신고 · 횟수 제한 · 오류 기록용 표. SQL Editor에 붙여 넣고 한 번 실행한다.

create table if not exists reports (
  id         bigint generated always as identity primary key,
  lab_id     text not null references labs(id) on delete cascade,  -- 연구소가 지워지면 신고도 함께 지워진다
  sample_id  text not null,                                         -- 신고된 답(표본) 번호
  reason     text not null,                                         -- 0 욕설·비방 1 괴롭힘 2 개인정보 3 장난·도배 4 기타
  at         bigint not null
);
create index if not exists reports_lab_id on reports(lab_id);

create table if not exists rate (
  k    text primary key,     -- 종류:바꾼 접속 주소:시간 구간
  n    integer not null,     -- 그 구간의 횟수
  win  bigint not null       -- 구간 시작 시각. 하루가 지나면 정기 실행 때 지운다
);

create table if not exists errors (
  id       bigint generated always as identity primary key,
  at       bigint not null,
  path     text not null,
  message  text not null     -- 열쇠처럼 보이는 문자열은 지우고 200자까지만
);
create index if not exists errors_at on errors(at);

alter table reports enable row level security;
alter table rate enable row level security;
alter table errors enable row level security;
