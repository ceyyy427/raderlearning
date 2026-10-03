-- Facts, stories (events), heat, reports and topics.

CREATE TABLE stories (
  id                 bigserial PRIMARY KEY,
  public_id          uuid NOT NULL UNIQUE,
  title              text NOT NULL,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'watching', 'settled')),
  action             text,
  frame              jsonb,
  first_report_at    timestamptz,
  latest_at          timestamptz,
  digest             text,
  digest_updated_at  timestamptz,
  latest             text,
  merged_into        bigint REFERENCES stories (id),
  version            integer NOT NULL DEFAULT 1,
  origin             text NOT NULL DEFAULT 'model' CHECK (origin IN ('model', 'replay', 'manual')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stories_latest_idx ON stories (latest_at DESC) WHERE merged_into IS NULL;

-- Old public ids of merged stories answer 308 to the survivor.
CREATE TABLE story_aliases (
  public_id   uuid PRIMARY KEY,
  story_id    bigint NOT NULL REFERENCES stories (id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE story_links (
  story_id    bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  other_id    bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  relation    text NOT NULL CHECK (relation IN ('storyline', 'related')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, other_id)
);

CREATE TABLE story_digests (
  story_id     bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  version      integer NOT NULL,
  digest       text NOT NULL,
  latest       text,
  receipt_id   bigint,
  article_ids  text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, version)
);

-- A fact is one concrete change supported by sources: subject, action, object, time, conditions.
CREATE TABLE facts (
  id           bigserial PRIMARY KEY,
  public_id    text NOT NULL UNIQUE,
  story_id     bigint REFERENCES stories (id),
  title        text NOT NULL,
  subject      text,
  action       text,
  object       text,
  conditions   text,
  occurred_at  timestamptz,
  version      integer NOT NULL DEFAULT 1,
  manual       boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX facts_story_idx ON facts (story_id);

CREATE TABLE fact_articles (
  fact_id     bigint NOT NULL REFERENCES facts (id) ON DELETE CASCADE,
  article_id  text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'report' CHECK (role IN ('primary', 'report', 'mention')),
  evidence    text,
  manual      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fact_id, article_id)
);

CREATE INDEX fact_articles_article_idx ON fact_articles (article_id);

-- Discussion evidence for heat: one row per participant and article, dated by source time.
CREATE TABLE story_signals (
  story_id         bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  article_id       text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  participant_key  text NOT NULL,
  source_id        text NOT NULL,
  kind             text NOT NULL CHECK (kind IN ('editorial', 'signal')),
  observed_at      timestamptz NOT NULL,
  PRIMARY KEY (story_id, article_id)
);

CREATE INDEX story_signals_time_idx ON story_signals (observed_at DESC);
CREATE INDEX story_signals_story_idx ON story_signals (story_id, observed_at DESC);

CREATE TABLE hot_rankings (
  id            bigserial PRIMARY KEY,
  computed_at   timestamptz NOT NULL DEFAULT now(),
  rule_version  text NOT NULL,
  entries       jsonb NOT NULL,
  evidence      jsonb,
  published     boolean NOT NULL DEFAULT true
);

CREATE INDEX hot_rankings_time_idx ON hot_rankings (computed_at DESC) WHERE published;

CREATE TABLE story_heat_hourly (
  story_id      bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  hour          timestamptz NOT NULL,
  heat          numeric(10, 3) NOT NULL,
  participants  integer NOT NULL,
  cohort        integer NOT NULL DEFAULT 0,
  complete      boolean NOT NULL DEFAULT true,
  PRIMARY KEY (story_id, hour)
);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

CREATE TABLE reports (
  id            bigserial PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN ('daily', 'weekly', 'monthly')),
  key           text NOT NULL,
  window_start  timestamptz NOT NULL,
  window_end    timestamptz NOT NULL,
  content       jsonb NOT NULL,
  generated_at  timestamptz NOT NULL,
  model         text,
  revision      integer NOT NULL DEFAULT 1,
  origin        text NOT NULL DEFAULT 'model' CHECK (origin IN ('model', 'imported', 'manual')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, key)
);

CREATE TABLE report_revisions (
  report_id     bigint NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  revision      integer NOT NULL,
  content       jsonb NOT NULL,
  generated_at  timestamptz NOT NULL,
  reason        text,
  PRIMARY KEY (report_id, revision)
);

-- ---------------------------------------------------------------------------
-- Topics (38 published; slugs never change)
-- ---------------------------------------------------------------------------

CREATE TABLE topics (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  grp         text NOT NULL CHECK (grp IN ('company', 'field', 'genre')),
  entity_id   text,
  tags        text[] NOT NULL,
  definition  text NOT NULL,
  related     text[] NOT NULL DEFAULT '{}',
  position    integer NOT NULL
);
