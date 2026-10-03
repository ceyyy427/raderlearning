-- Detail pages of selected items are indexed automatically. An editor can
-- still mark any other public page for indexing, or exclude a page, which then stays out.
ALTER TABLE publications ADD COLUMN seo_excluded_at timestamptz;
UPDATE publications SET indexable = (visibility = 'public' AND summary IS NOT NULL AND (selected OR seo_indexed_at IS NOT NULL))
WHERE indexable IS DISTINCT FROM (visibility = 'public' AND summary IS NOT NULL AND (selected OR seo_indexed_at IS NOT NULL));
