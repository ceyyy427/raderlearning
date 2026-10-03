-- Detail pages are noindex unless marked for indexing: the set an editor marked and
-- whatever the admin marks later. publications.indexable follows the mark (and public visibility).
ALTER TABLE publications ADD COLUMN seo_indexed_at timestamptz;
UPDATE publications SET indexable = false WHERE indexable;
