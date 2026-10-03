-- Collection checks exact URLs before fetching bodies. Without this index every batch scans all
-- imported articles. On a large existing database, build this same index CONCURRENTLY before
-- updating; IF NOT EXISTS makes the transactional migration a no-op there.
CREATE INDEX IF NOT EXISTS articles_url_idx ON articles (url);
