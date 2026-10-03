-- Manual "keep this report on its own" decisions (admin split). Automatic grouping, retries and
-- later revisions never re-attach the article; an explicit regroup in the admin removes the row.
CREATE TABLE grouping_overrides (
  article_id  text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  mode        text NOT NULL DEFAULT 'standalone' CHECK (mode IN ('standalone')),
  reason      text,
  actor       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- What a digest version was written from (report ids, titles, summaries), so a corrected summary
-- rewrites the digest even when no report was added.
ALTER TABLE story_digests ADD COLUMN inputs_hash text;
