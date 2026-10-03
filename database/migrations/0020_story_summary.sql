-- A story's own factual summary ("事实说明"), shown when it has no digest yet. Hot-pipeline stories
-- imported with one carry it; stories without it fall back to a report's summary.
ALTER TABLE stories ADD COLUMN summary text;
