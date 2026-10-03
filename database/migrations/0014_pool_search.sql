-- Search over the public pool (/all, v1 q=): one narrow row per eligible item, kept by the publish
-- step. `direct` is the title/summary/subject/source text (the default search); `body` is the start
-- of the lower-cased body for items whose full text may be shown (the "全文相关" search). Trigram
-- indexes serve terms of three or more characters; shorter ones scan this small table instead of
-- every publication and article.
CREATE TABLE pool_search (
  article_id  text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  direct      text NOT NULL,
  body        text NOT NULL DEFAULT ''
);

INSERT INTO pool_search (article_id, direct, body)
SELECT p.article_id, p.search_text,
       CASE WHEN p.body_mode = 'full' THEN lower(left(coalesce(a.body_text, ''), 12000)) ELSE '' END
FROM publications p JOIN articles a ON a.id = p.article_id
WHERE p.eligible;

CREATE INDEX pool_search_direct_trgm_idx ON pool_search USING gin (direct gin_trgm_ops);
CREATE INDEX pool_search_body_trgm_idx ON pool_search USING gin (body gin_trgm_ops);
