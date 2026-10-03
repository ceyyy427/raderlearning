-- Codex reset monitor, model leaderboard, notifications.

-- ---------------------------------------------------------------------------
-- Codex reset monitor (F12)
-- ---------------------------------------------------------------------------

CREATE TABLE monitor_posts (
  id             text PRIMARY KEY,
  author         text NOT NULL,
  published_at   timestamptz NOT NULL,
  text           text NOT NULL,
  url            text NOT NULL,
  context        jsonb NOT NULL DEFAULT '[]',
  raw            jsonb,
  translation    text,
  recognition    jsonb,
  receipt_id     bigint,
  origin         text NOT NULL DEFAULT 'live' CHECK (origin IN ('live', 'imported')),
  collected_at   timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz
);

CREATE INDEX monitor_posts_time_idx ON monitor_posts (published_at DESC);

CREATE TABLE monitor_events (
  id                   text PRIMARY KEY,
  type                 text NOT NULL CHECK (type IN ('direct_reset', 'reset_credit')),
  status               text NOT NULL CHECK (status IN ('announced', 'confirmed')),
  title                text NOT NULL,
  scope                text NOT NULL DEFAULT '',
  schedule             jsonb,
  estimate             jsonb,
  presentation         jsonb,
  confirmed_at         timestamptz,
  occurred_on          date,
  confirmation_basis   text CHECK (confirmation_basis IN ('source_post', 'receipt_review')),
  withdrawn            boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL,
  updated_at           timestamptz NOT NULL
);

CREATE TABLE monitor_event_posts (
  event_id       text NOT NULL REFERENCES monitor_events (id) ON DELETE CASCADE,
  post_id        text NOT NULL REFERENCES monitor_posts (id) ON DELETE CASCADE,
  stage          text NOT NULL,
  action         text,
  text           text NOT NULL,
  original_text  text NOT NULL,
  PRIMARY KEY (event_id, post_id)
);

CREATE TABLE monitor_state (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Model leaderboard (F11)
-- ---------------------------------------------------------------------------

CREATE TABLE lb_models (
  id                           text PRIMARY KEY,
  slug                         text NOT NULL UNIQUE,
  name                         text NOT NULL,
  provider                     text,
  provider_slug                text,
  released_at                  timestamptz,
  release_date_source          text,
  context_window_tokens        integer,
  input_price_usd              numeric(12, 4),
  output_price_usd             numeric(12, 4),
  metadata_source              text,
  metadata_updated_at          timestamptz,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lb_aliases (
  id                text PRIMARY KEY,
  source_key        text NOT NULL,
  alias             text NOT NULL,
  normalized_alias  text NOT NULL,
  model_id          text NOT NULL REFERENCES lb_models (id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lb_aliases_lookup_idx ON lb_aliases (source_key, normalized_alias);

CREATE TABLE lb_snapshots (
  id               text PRIMARY KEY,
  source_key       text NOT NULL,
  source_name      text NOT NULL,
  source_url       text,
  license          text,
  attribution_url  text,
  content_hash     text,
  published_at     timestamptz,
  fetched_at       timestamptz NOT NULL,
  record_count     integer NOT NULL DEFAULT 0,
  metadata         jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX lb_snapshots_source_idx ON lb_snapshots (source_key, fetched_at DESC);

CREATE TABLE lb_scores (
  id                      text PRIMARY KEY,
  snapshot_id             text NOT NULL REFERENCES lb_snapshots (id) ON DELETE CASCADE,
  model_id                text NOT NULL REFERENCES lb_models (id),
  configuration_key       text NOT NULL,
  configuration_label     text,
  configuration_kind      text,
  configuration_priority  integer,
  selected_for_product    boolean NOT NULL DEFAULT false,
  selection_reason        text,
  metric_key              text NOT NULL,
  metric_name             text,
  raw_score               double precision,
  normalized_score        double precision,
  lower_bound             double precision,
  upper_bound             double precision,
  source_rank             integer,
  sample_size             integer,
  source_model_name       text,
  source_organization     text,
  source_published_at     timestamptz,
  metadata                jsonb NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lb_scores_snapshot_idx ON lb_scores (snapshot_id);
CREATE INDEX lb_scores_model_idx ON lb_scores (model_id);

CREATE TABLE lb_runs (
  id                   text PRIMARY KEY,
  methodology_version  text NOT NULL,
  generated_at         timestamptz NOT NULL,
  source_snapshot_ids  text[] NOT NULL DEFAULT '{}',
  summary              jsonb NOT NULL DEFAULT '{}',
  status               text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'failed', 'shadow', 'historical')),
  origin               text NOT NULL DEFAULT 'computed' CHECK (origin IN ('computed', 'imported')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lb_rankings (
  id                bigserial PRIMARY KEY,
  run_id            text NOT NULL REFERENCES lb_runs (id) ON DELETE CASCADE,
  board             text NOT NULL,
  model_id          text NOT NULL REFERENCES lb_models (id),
  rank              integer NOT NULL,
  score             double precision,
  uncertainty       double precision,
  coverage          double precision,
  confidence        text,
  metric_count      integer,
  summary           text,
  component_scores  jsonb,
  detail            jsonb,
  UNIQUE (run_id, board, model_id)
);

CREATE TABLE fx_rates (
  as_of        date NOT NULL,
  pair         text NOT NULL,
  rate         numeric(12, 6) NOT NULL,
  source_name  text NOT NULL,
  source_url   text,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (as_of, pair)
);

-- ---------------------------------------------------------------------------
-- Notifications (F21)
-- ---------------------------------------------------------------------------

CREATE TABLE notify_targets (
  key          text PRIMARY KEY,
  purpose      text NOT NULL CHECK (purpose IN ('content', 'alert', 'feedback')),
  kind         text NOT NULL CHECK (kind IN ('feishu_webhook', 'feishu_chat', 'log')),
  enabled      boolean NOT NULL DEFAULT false,
  -- Content published before a slot was enabled is never back-filled into it.
  enabled_at   timestamptz,
  config_ref   text,
  note         text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deliveries (
  id             bigserial PRIMARY KEY,
  target_key     text NOT NULL REFERENCES notify_targets (key),
  subject_kind   text NOT NULL,
  subject_id     text NOT NULL,
  dedupe_key     text NOT NULL,
  status         text NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'unknown', 'skipped')),
  attempts       integer NOT NULL DEFAULT 0,
  payload        jsonb,
  response       text,
  origin         text NOT NULL DEFAULT 'live' CHECK (origin IN ('live', 'imported')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_key, dedupe_key)
);

CREATE INDEX deliveries_status_idx ON deliveries (status, created_at);

-- Short leases keep concurrent same-title cards out before the formal identity is known.
CREATE TABLE delivery_leases (
  lease_key   text PRIMARY KEY,
  holder      text NOT NULL,
  expires_at  timestamptz NOT NULL
);
