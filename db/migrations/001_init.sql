-- Modo Professor (#71): turmas, atividades, participantes, envios e limite de tentativas.
-- Especificação: docs/modo-professor-turmas-ranking-orcamento.md, seção 4.

CREATE TABLE teachers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username       text NOT NULL UNIQUE,
  display_name   text NOT NULL,
  password_hash  text NOT NULL,
  recovery_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classrooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name         text NOT NULL,
  code         char(6) NOT NULL UNIQUE,
  joins_open   boolean NOT NULL DEFAULT true,
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classrooms_by_teacher ON classrooms (teacher_id);

CREATE TYPE activity_status AS ENUM ('RASCUNHO', 'ATIVA', 'ENCERRADA');

CREATE TABLE activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  title        text NOT NULL,
  config       jsonb NOT NULL,
  status       activity_status NOT NULL DEFAULT 'RASCUNHO',
  catalog_rev  text NOT NULL,
  started_at   timestamptz,
  closed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- No máximo uma atividade ativa por turma
CREATE UNIQUE INDEX one_active_activity ON activities (classroom_id) WHERE status = 'ATIVA';

CREATE TABLE participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  display_name  text NOT NULL,
  token_hash    text NOT NULL UNIQUE,
  live          jsonb,
  removed_at    timestamptz,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, display_name)
);

CREATE TYPE submission_status AS ENUM ('VALIDO', 'SINALIZADO', 'INVALIDO');

CREATE TABLE submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  participant_id  uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  attempt_no      smallint NOT NULL,
  build           jsonb NOT NULL,
  metrics         jsonb NOT NULL,
  completed       boolean NOT NULL,
  score_total     integer NOT NULL,
  breakdown       jsonb NOT NULL,
  total_spent     integer NOT NULL,
  status          submission_status NOT NULL DEFAULT 'VALIDO',
  flags           text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, participant_id, attempt_no)
);
CREATE INDEX submissions_by_activity ON submissions (activity_id, score_total DESC);

CREATE TABLE rate_limits (
  key           text PRIMARY KEY,
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL
);
