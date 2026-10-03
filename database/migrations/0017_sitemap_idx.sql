-- Sitemaps list indexable public items newest first.
CREATE INDEX publications_indexable_timeline_idx ON publications (timeline_at DESC) WHERE visibility = 'public' AND indexable;
