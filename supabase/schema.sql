-- KAEHAE 저장소 표. Supabase 대시보드의 SQL Editor에 붙여 넣고 한 번 실행한다.
-- 시각은 모두 밀리초(1970-01-01 기준) 숫자로 저장한다.

create table if not exists labs (
  id          text primary key,              -- 초대 링크에 들어가는 연구소 번호
  key         text not null,                 -- 주인만 아는 열쇠
  name        text not null,                 -- 연구 대상 이름
  rot_a       text not null default '03',    -- 고른 감각 실험
  rot_b       text not null default '08',    -- 고른 상황 실험
  rel         boolean not null default true, -- 관계 데이터 실험 포함 여부
  open        boolean not null default true, -- 응답 받는 중인지
  self        jsonb,                         -- 셀프 캐해 답 (색, 취향 5문항)
  hidden      jsonb not null default '[]',   -- 주인이 숨긴 표본 번호
  created_at  bigint not null,
  last_at     bigint not null                -- 마지막 표본이 들어온 때(없으면 만든 때). 이로부터 30일 뒤 자동 삭제
);

create table if not exists samples (
  id      text primary key,
  lab_id  text not null references labs(id) on delete cascade,
  at      bigint not null,                   -- 제출한 때
  data    jsonb not null                     -- 연구원이 낸 답 전체
);

create index if not exists samples_lab_id on samples(lab_id);
create index if not exists labs_last_at on labs(last_at);

-- 브라우저에서 직접 읽고 쓰지 못하게 막는다. 서버만 서비스 키로 접근한다.
alter table labs enable row level security;
alter table samples enable row level security;
