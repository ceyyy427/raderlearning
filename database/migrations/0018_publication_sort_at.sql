-- Reading-group anchor of a selected item: the earliest timeline time among the public pool members
-- of its fact, so a group keeps its place when a later report becomes its representative. The home
-- timeline, v1 selected by=timeline and the transitional feed order selected items by it; any other
-- item's sort_at is its own timeline time.
ALTER TABLE publications ADD COLUMN sort_at timestamptz;
UPDATE publications SET sort_at = timeline_at;
UPDATE publications p SET sort_at = a.anchor
FROM (
  SELECT s.article_id, (SELECT min(m.timeline_at) FROM publications m WHERE m.fact_id = s.fact_id AND m.eligible AND m.visibility = 'public') AS anchor
  FROM publications s WHERE s.selected AND s.fact_id IS NOT NULL
) a
WHERE p.article_id = a.article_id AND a.anchor IS NOT NULL AND a.anchor < p.timeline_at;
ALTER TABLE publications ALTER COLUMN sort_at SET NOT NULL;
CREATE INDEX publications_selected_sort_idx ON publications (sort_at DESC, article_id) WHERE visibility = 'public' AND selected;
