-- Grouping decision time per article: the release gate opens early once formal grouping is done.
ALTER TABLE articles ADD COLUMN grouped_at timestamptz;
ALTER TABLE articles ADD COLUMN processing_state text NOT NULL DEFAULT 'new'
  CHECK (processing_state IN ('new', 'analyzed', 'skipped', 'failed', 'blocked'));
ALTER TABLE articles ADD COLUMN processing_error text;

CREATE INDEX articles_processing_idx ON articles (processing_state, discovered_at) WHERE processing_state IN ('new', 'failed');
