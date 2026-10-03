-- Codex reset monitor: fields the public snapshot (v1 codex-resets, /codex-reset) shows directly.
ALTER TABLE monitor_events
  ADD COLUMN label          text NOT NULL DEFAULT '',
  ADD COLUMN display_label  text NOT NULL DEFAULT '';

-- Activity role of a source post: an event update (announce/confirm/amend/withdraw) or a related
-- interaction that never changes reset status by itself.
ALTER TABLE monitor_posts
  ADD COLUMN activity  jsonb,
  ADD COLUMN outage    jsonb;

CREATE INDEX monitor_event_posts_post_idx ON monitor_event_posts (post_id);
