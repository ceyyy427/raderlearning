-- Embeddings for event candidate recall (no pgvector: recall scans a bounded recent window).
CREATE TABLE embeddings (
  kind        text NOT NULL CHECK (kind IN ('fact', 'article', 'story')),
  ref_id      text NOT NULL,
  model       text NOT NULL,
  text_hash   text NOT NULL,
  vector      real[] NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, ref_id, model)
);

-- Grouping decisions for traceability (which candidates, which verdict, which receipt).
CREATE TABLE grouping_decisions (
  id           bigserial PRIMARY KEY,
  article_id   text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  fact_id      bigint,
  story_id     bigint,
  verdict      text NOT NULL,
  candidates   jsonb,
  receipt_id   bigint,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX grouping_decisions_article_idx ON grouping_decisions (article_id, id DESC);
CREATE INDEX facts_created_idx ON facts (created_at DESC);
