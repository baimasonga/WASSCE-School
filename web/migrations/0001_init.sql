-- Learner data is keyed by the Supabase user id (auth.users.id).
CREATE TABLE attempts (
  user_id     TEXT    NOT NULL,
  attempt_key TEXT    NOT NULL,              -- "<session token>/<question id>": one score per question per session
  question_id TEXT    NOT NULL,
  subject_id  TEXT    NOT NULL DEFAULT 'mathematics',
  section     TEXT    NOT NULL,
  topic       TEXT    NOT NULL,
  answer      TEXT    NOT NULL,              -- "" when unanswered in an exam
  correct     INTEGER NOT NULL,
  country     TEXT,
  exam_year   INTEGER,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, attempt_key)
);
CREATE INDEX attempts_user_time ON attempts (user_id, created_at DESC);

CREATE TABLE bookmarks (
  user_id     TEXT NOT NULL,
  question_id TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);

-- Finished practice sets and mock exams, for the progress history.
CREATE TABLE sessions (
  user_id     TEXT    NOT NULL,
  token       TEXT    NOT NULL,
  exam        INTEGER NOT NULL,
  label       TEXT    NOT NULL,
  subject_id  TEXT    NOT NULL,
  correct     INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  answered    INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  sections    TEXT    NOT NULL DEFAULT '[]',   -- JSON [{section, correct, total}]
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, token)
);
CREATE INDEX sessions_user_time ON sessions (user_id, created_at DESC);

-- Question packs uploaded by admins. content is the validated pack JSON.
CREATE TABLE packs (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  version     TEXT    NOT NULL,
  subject_id  TEXT    NOT NULL,
  question_count INTEGER NOT NULL,
  content     TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_by  TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL
);
