-- Chinese translations of the posts selected X posts quote, one per quoted post (every quote of the
-- same announcement shares it). text_hash is the quoted text translated: a longer rendering of the
-- same post (a note tweet read in full) is translated again.
CREATE TABLE IF NOT EXISTS quote_translations (
  tweet_id    text PRIMARY KEY,
  text_hash   text NOT NULL,
  text_zh     text NOT NULL,
  origin      text NOT NULL DEFAULT 'model' CHECK (origin IN ('model', 'reused')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
