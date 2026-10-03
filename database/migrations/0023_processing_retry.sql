-- Article processing bookkeeping: when the article was last handed to a queue (the safety net skips
-- articles already queued or running), how many processing attempts failed, and when the next one
-- may start. A provider outage makes articles wait and retry instead of failing for good.
ALTER TABLE articles
  ADD COLUMN processing_queued_at timestamptz,
  ADD COLUMN processing_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN processing_retry_at timestamptz;

DROP INDEX IF EXISTS articles_processing_idx;
CREATE INDEX articles_processing_idx ON articles (processing_state, processing_retry_at) WHERE processing_state IN ('new', 'failed');
