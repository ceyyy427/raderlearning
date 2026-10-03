-- Core schema: sources, articles, editorial results, public projection, sync ledger.
-- Times are UTC timestamptz; report calendars are computed in Asia/Shanghai by the application.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Sources and collection
-- ---------------------------------------------------------------------------

CREATE TABLE sources (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  kind                text NOT NULL CHECK (kind IN ('rss', 'web_list', 'json_list', 'x_search', 'mp_account', 'external')),
  config              jsonb NOT NULL DEFAULT '{}',
  tags                text[] NOT NULL DEFAULT '{}',
  first_party         boolean NOT NULL DEFAULT false,
  owner_entity_id     text,
  tier                text NOT NULL DEFAULT 'T2' CHECK (tier IN ('T1', 'T1_5', 'T2', 'EXCLUDE_MP')),
  participation_mode  text NOT NULL DEFAULT 'editorial' CHECK (participation_mode IN ('editorial', 'hot_signal', 'isolated')),
  signal_group_id     text,
  interval_minutes    integer NOT NULL DEFAULT 30 CHECK (interval_minutes BETWEEN 1 AND 1440),
  -- Two separate licences: showing full text on this site, and redistributing it (full RSS).
  site_fulltext       boolean NOT NULL DEFAULT true,
  syndicate_fulltext  boolean NOT NULL DEFAULT false,
  enabled             boolean NOT NULL DEFAULT true,
  health              text NOT NULL DEFAULT 'unknown' CHECK (health IN ('ok', 'degraded', 'failing', 'paused', 'unknown')),
  fail_count          integer NOT NULL DEFAULT 0,
  last_fetch_at       timestamptz,
  last_ok_at          timestamptz,
  last_error          text,
  -- Successful collection position; never advanced by a failed fetch.
  cursor              jsonb,
  next_fetch_at       timestamptz,
  icon_url            text,
  imported_from       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sources_due_idx ON sources (next_fetch_at) WHERE enabled;

CREATE TABLE fetch_runs (
  id            bigserial PRIMARY KEY,
  source_id     text NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed', 'skipped')),
  found_count   integer NOT NULL DEFAULT 0,
  new_count     integer NOT NULL DEFAULT 0,
  error         text,
  detail        jsonb
);

CREATE INDEX fetch_runs_source_idx ON fetch_runs (source_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- Articles (one per real-world material) and their revisions
-- ---------------------------------------------------------------------------

CREATE TABLE articles (
  id                 text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  source_id          text NOT NULL REFERENCES sources (id),
  identity_key       text NOT NULL UNIQUE,
  url                text NOT NULL,
  title              text NOT NULL,
  author             text,
  language           text,
  -- Trusted source publication time; null when unknown or claimed >1h in the future.
  published_at       timestamptz,
  published_at_claim timestamptz,
  discovered_at      timestamptz NOT NULL,
  source_updated_at  timestamptz,
  -- Timeline sort value: discovery time, or source time for archived backfill.
  timeline_at        timestamptz NOT NULL,
  backfill           boolean NOT NULL DEFAULT false,
  backfill_reason    text,
  revision           integer NOT NULL DEFAULT 1,
  content_hash       text,
  excerpt            text,
  body_text          text,
  body_html          text,
  body_status        text NOT NULL DEFAULT 'pending' CHECK (body_status IN ('pending', 'ok', 'unconfirmed', 'none')),
  media              jsonb NOT NULL DEFAULT '[]',
  x_post             jsonb,
  raw                jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX articles_source_idx ON articles (source_id, discovered_at DESC);
CREATE INDEX articles_discovered_idx ON articles (discovered_at DESC);

CREATE TABLE article_revisions (
  article_id    text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  revision      integer NOT NULL,
  content_hash  text,
  title         text NOT NULL,
  body_text     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, revision)
);

-- The same material found through several entrances keeps one article and many discoveries.
CREATE TABLE article_discoveries (
  article_id     text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  source_id      text NOT NULL,
  via            text NOT NULL,
  discovered_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, source_id, via)
);

CREATE TABLE translations (
  article_id    text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  lang          text NOT NULL DEFAULT 'zh',
  revision      integer NOT NULL,
  title         text,
  body_html     text,
  body_text     text,
  complete      boolean NOT NULL DEFAULT true,
  origin        text NOT NULL DEFAULT 'model' CHECK (origin IN ('model', 'replay', 'source')),
  receipt_id    bigint,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, lang)
);

-- ---------------------------------------------------------------------------
-- Paid request receipts and budgets
-- ---------------------------------------------------------------------------

CREATE TABLE receipts (
  id            bigserial PRIMARY KEY,
  -- Stable identity of one logical paid request: task + input revision + provider + model + prompt + config.
  logical_key   text NOT NULL UNIQUE,
  service       text NOT NULL,
  model         text,
  purpose       text NOT NULL,
  subject       text,
  status        text NOT NULL CHECK (status IN ('pending', 'received', 'completed', 'failed', 'unknown')),
  request       jsonb,
  response      jsonb,
  request_id    text,
  usage         jsonb,
  cost          numeric(14, 6),
  currency      text,
  cost_basis    text CHECK (cost_basis IN ('actual', 'estimated')),
  error         text,
  attempts      integer NOT NULL DEFAULT 0,
  origin        text NOT NULL DEFAULT 'live' CHECK (origin IN ('live', 'replay', 'imported')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  received_at   timestamptz,
  completed_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX receipts_service_time_idx ON receipts (service, created_at);
CREATE INDEX receipts_subject_idx ON receipts (subject);
CREATE INDEX receipts_status_idx ON receipts (status) WHERE status IN ('pending', 'unknown');

-- Per-minute / hour / day request budgets for paid services. Any zero stops the service.
CREATE TABLE budgets (
  service     text PRIMARY KEY,
  per_minute  integer NOT NULL,
  per_hour    integer NOT NULL,
  per_day     integer NOT NULL,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Editorial judgements (append-only) and manual overrides
-- ---------------------------------------------------------------------------

CREATE TABLE analyses (
  id               bigserial PRIMARY KEY,
  article_id       text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  input_revision   integer NOT NULL,
  origin           text NOT NULL CHECK (origin IN ('model', 'replay', 'rule')),
  model            text,
  prompt_version   text,
  receipt_ids      bigint[] NOT NULL DEFAULT '{}',
  relevance        text CHECK (relevance IN ('pass', 'block', 'unknown')),
  category         text,  -- a key of CATEGORIES in industry/taxonomy.ts (checked in code, so an industry can change them)
  tags             text[] NOT NULL DEFAULT '{}',
  subjects         text[] NOT NULL DEFAULT '{}',
  title_zh         text,
  summary_zh       text,
  reason_zh        text,
  score            numeric(5, 2),
  selected         boolean,
  output           jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analyses_article_idx ON analyses (article_id, id DESC);

-- Manual corrections win over model output; version-checked so stale jobs cannot overwrite them.
CREATE TABLE editorial_overrides (
  article_id  text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  fields      jsonb NOT NULL DEFAULT '{}',
  visibility  text CHECK (visibility IN ('public', 'summary-only', 'withdrawn')),
  reason      text,
  version     integer NOT NULL DEFAULT 1,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Public projection: the single place every public exit reads from
-- ---------------------------------------------------------------------------

CREATE TABLE publications (
  article_id          text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  analysis_id         bigint,
  revision            integer NOT NULL DEFAULT 1,
  visibility          text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'summary-only', 'withdrawn')),
  -- Belongs to the public pool (/all): editorial source, AI relevant, has Chinese title and summary.
  eligible            boolean NOT NULL DEFAULT false,
  selected            boolean NOT NULL DEFAULT false,
  title               text NOT NULL,
  original_title      text,
  summary             text,
  reason              text,
  category            text,
  tags                text[] NOT NULL DEFAULT '{}',
  score               numeric(5, 2),
  source_id           text NOT NULL,
  channel             text NOT NULL CHECK (channel IN ('news', 'x')),
  first_party         boolean NOT NULL DEFAULT false,
  url                 text NOT NULL,
  published_at        timestamptz,
  discovered_at       timestamptz NOT NULL,
  timeline_at         timestamptz NOT NULL,
  backfill            boolean NOT NULL DEFAULT false,
  -- Release gate: first time the item met the selected conditions, and first release.
  selected_ready_at   timestamptz,
  visible_after       timestamptz,
  body_mode           text NOT NULL DEFAULT 'summary' CHECK (body_mode IN ('full', 'summary')),
  syndicate           boolean NOT NULL DEFAULT false,
  indexable           boolean NOT NULL DEFAULT false,
  story_id            bigint,
  fact_id             bigint,
  search_text         text NOT NULL DEFAULT '',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX publications_selected_timeline_idx ON publications (timeline_at DESC, article_id)
  WHERE visibility = 'public' AND selected;
CREATE INDEX publications_pool_timeline_idx ON publications (timeline_at DESC, article_id)
  WHERE visibility = 'public' AND eligible;
CREATE INDEX publications_pool_published_idx ON publications ((coalesce(published_at, discovered_at)) DESC, article_id)
  WHERE visibility = 'public' AND eligible;
CREATE INDEX publications_tags_idx ON publications USING gin (tags);
CREATE INDEX publications_search_trgm_idx ON publications USING gin (search_text gin_trgm_ops);
CREATE INDEX publications_story_idx ON publications (story_id) WHERE story_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Selected sync ledger (v1 snapshot + changes)
-- ---------------------------------------------------------------------------
-- seq is assigned under a transaction-scoped advisory lock inside the short publish transaction,
-- so seq order equals commit order. visible_at holds the watermark back until the release gate passes.

CREATE TABLE selected_ledger (
  seq         bigint PRIMARY KEY,
  article_id  text NOT NULL,
  op          text NOT NULL CHECK (op IN ('upsert', 'remove')),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  visible_at  timestamptz NOT NULL DEFAULT now(),
  payload     jsonb
);

CREATE INDEX selected_ledger_article_idx ON selected_ledger (article_id, seq DESC);
CREATE INDEX selected_ledger_visible_idx ON selected_ledger (visible_at) ;

CREATE TABLE selected_state (
  article_id    text PRIMARY KEY,
  in_set        boolean NOT NULL,
  payload_hash  text,
  last_seq      bigint NOT NULL
);
