-- Admin identity, audit, feedback, ingest reports, settings and job runs.

CREATE TABLE admin_users (
  id              bigserial PRIMARY KEY,
  feishu_union_id text UNIQUE,
  email           text UNIQUE,
  display_name    text,
  role            text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz
);

-- Opaque session ids are stored hashed; the cookie carries the random value only.
CREATE TABLE admin_sessions (
  id_hash      text PRIMARY KEY,
  user_id      bigint NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  csrf_token   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  user_agent   text
);

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor       text NOT NULL,
  action      text NOT NULL,
  subject     text,
  reason      text,
  before      jsonb,
  after       jsonb,
  request_id  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_subject_idx ON audit_log (subject, created_at DESC);

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

CREATE TABLE feedback (
  id                bigserial PRIMARY KEY,
  content           text NOT NULL,
  email             text,
  page_url          text,
  screenshot_key    text,
  source_hash       text NOT NULL,
  status            text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'replied', 'resolved', 'spam')),
  note              text,
  forwarded_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feedback_bans (
  source_hash  text PRIMARY KEY,
  reason       text,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- External ingest reports (POST /api/ingest/items)
-- ---------------------------------------------------------------------------

CREATE TABLE ingest_events (
  id           bigserial PRIMARY KEY,
  client       text NOT NULL,
  kind         text NOT NULL,
  status       text NOT NULL,
  summary      jsonb,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ingest_events_client_idx ON ingest_events (client, created_at DESC);

-- Small key-value settings editable from the admin (e.g. about-page QR code file names).
CREATE TABLE settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Stored files (screenshots, QR codes, OG cache) addressed by content hash.
CREATE TABLE stored_files (
  key           text PRIMARY KEY,
  content_type  text NOT NULL,
  bytes         integer NOT NULL,
  purpose       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz
);

-- Last run of every scheduled job, for the operations view.
CREATE TABLE job_runs (
  id           bigserial PRIMARY KEY,
  job          text NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed', 'skipped')),
  detail       jsonb,
  error        text
);

CREATE INDEX job_runs_job_idx ON job_runs (job, started_at DESC);
