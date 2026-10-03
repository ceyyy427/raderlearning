-- The long-form X Article a post published ({title, text}), fetched before the post is judged: the
-- post itself is often only the article's link. Kept apart from x_post so list reads stay small.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS x_article jsonb;
