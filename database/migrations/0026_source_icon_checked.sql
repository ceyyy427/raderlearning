-- When the icon finder last looked at a source, so a source without a findable icon is retried
-- monthly rather than every day.
ALTER TABLE sources ADD COLUMN IF NOT EXISTS icon_checked_at timestamptz;
