-- 운영자용 이용 통계(방문 단계 · 제출 · 공유). SQL Editor에 붙여 넣고 한 번 실행한다.
-- 이름은 담지 않고 기기별 임의 번호(dev)만 쓴다. 90일이 지나면 정기 실행 때 지운다.
-- 연구소가 지워져도 통계는 남도록 labs 표와 묶지 않는다.

create table if not exists events (
  id    bigint generated always as identity primary key,
  at    bigint not null,
  kind  text not null,     -- step · submit · share · lab_created · make_click · key_saved · b_view
  role  text not null,     -- a 연구소 만들기 · r 응답하기 · b 내 연구소
  lab   text,              -- 연구소 번호 (만들기 전이면 없음)
  dev   text not null,     -- 기기별 임의 번호
  meta  jsonb not null default '{}'
);
create index if not exists events_at on events(at);
alter table events enable row level security;
