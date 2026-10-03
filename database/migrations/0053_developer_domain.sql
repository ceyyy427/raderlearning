CREATE TABLE IF NOT EXISTS developer_projects (
  id text PRIMARY KEY,
  provider text NOT NULL DEFAULT 'github' CHECK (provider = 'github'),
  owner text NOT NULL,
  repo text NOT NULL,
  name text NOT NULL,
  description text,
  default_branch text,
  language text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  watch_rules jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'learning', 'watching', 'paused')),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS developer_projects_status_idx ON developer_projects (status);

CREATE TABLE IF NOT EXISTS developer_source_snapshots (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES developer_projects(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('github_release', 'github_issue', 'github_pull_request', 'official_documentation', 'changelog')),
  provider_id text,
  url text NOT NULL,
  canonical_url text NOT NULL,
  fetched_at timestamptz NOT NULL,
  published_at timestamptz,
  content_hash text,
  raw_content text,
  version_from text,
  version_to text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'failed')),
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, canonical_url, content_hash)
);

CREATE INDEX IF NOT EXISTS developer_source_snapshots_project_idx ON developer_source_snapshots (project_id);
CREATE INDEX IF NOT EXISTS developer_source_snapshots_type_idx ON developer_source_snapshots (source_type);
CREATE INDEX IF NOT EXISTS developer_source_snapshots_fetched_idx ON developer_source_snapshots (fetched_at);

CREATE TABLE IF NOT EXISTS developer_change_events (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES developer_projects(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('release', 'breaking_change', 'deprecation', 'security', 'api_change', 'documentation', 'performance', 'ecosystem')),
  title text NOT NULL,
  source_url text NOT NULL,
  supporting_source_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  published_at timestamptz,
  detected_at timestamptz NOT NULL,
  version_from text,
  version_to text,
  importance integer NOT NULL CHECK (importance >= 0 AND importance <= 100),
  change_status text NOT NULL DEFAULT 'new' CHECK (change_status IN ('new', 'read', 'learning', 'completed', 'disputed', 'failed')),
  uncertainty text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS developer_change_events_project_idx ON developer_change_events (project_id);
CREATE INDEX IF NOT EXISTS developer_change_events_status_idx ON developer_change_events (change_status);
CREATE INDEX IF NOT EXISTS developer_change_events_detected_idx ON developer_change_events (detected_at);

CREATE TABLE IF NOT EXISTS developer_change_briefs (
  event_id text PRIMARY KEY REFERENCES developer_change_events(id) ON DELETE CASCADE,
  what_changed text NOT NULL,
  why_it_matters text NOT NULL,
  affected_users jsonb NOT NULL DEFAULT '[]'::jsonb,
  migration_required boolean,
  before_after jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL,
  model_version text,
  status text NOT NULL CHECK (status IN ('ready', 'uncertain', 'failed')),
  uncertainty text
);

CREATE INDEX IF NOT EXISTS developer_change_briefs_status_idx ON developer_change_briefs (status);

CREATE TABLE IF NOT EXISTS developer_learning_tasks (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES developer_change_events(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN ('code_reading', 'diff_judgement', 'migration_choice')),
  question text NOT NULL,
  starter_code text,
  expected_concept text NOT NULL,
  solution text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
);

CREATE INDEX IF NOT EXISTS developer_learning_tasks_event_idx ON developer_learning_tasks (event_id);

CREATE TABLE IF NOT EXISTS developer_review_cards (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES developer_change_events(id) ON DELETE CASCADE,
  misconception_code text,
  review_due_at timestamptz NOT NULL,
  mastery_state text NOT NULL DEFAULT 'new' CHECK (mastery_state IN ('new', 'learning', 'mastered')),
  user_note text
);

CREATE INDEX IF NOT EXISTS developer_review_cards_due_idx ON developer_review_cards (review_due_at);
CREATE INDEX IF NOT EXISTS developer_review_cards_event_idx ON developer_review_cards (event_id);

CREATE TABLE IF NOT EXISTS developer_personal_notes (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES developer_change_events(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS developer_personal_notes_event_idx ON developer_personal_notes (event_id);
