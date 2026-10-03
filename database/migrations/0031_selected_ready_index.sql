-- Reads of recently selected items filter selected_ready_at; a small partial index avoids scanning
-- the full publication history. On a large existing database, build it CONCURRENTLY before updating.
CREATE INDEX IF NOT EXISTS publications_selected_ready_idx ON publications (selected_ready_at)
  WHERE selected_ready_at IS NOT NULL;
