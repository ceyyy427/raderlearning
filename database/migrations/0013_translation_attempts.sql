-- Full-text translation attempts per article revision: items that will never get a translation (short
-- posts, Chinese bodies) or that failed three times are not picked up again until a new revision.
CREATE TABLE translation_attempts (
  article_id  text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  revision    integer NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  outcome     text NOT NULL CHECK (outcome IN ('translated', 'partial', 'skipped', 'failed')),
  reason      text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
