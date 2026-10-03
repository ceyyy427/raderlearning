-- Reports waiting for a regroup (scripts/regroup-events.ts). Until a report is decided again, its
-- automatic membership is not evidence for other reports, so a regroup in discovery order sees
-- what live grouping would have seen at the time; the report's own grouping decides it again.
CREATE TABLE regroup_pending (
  article_id   text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now()
);
