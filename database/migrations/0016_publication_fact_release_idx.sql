-- Timeline cards read the members of the facts on a page, and the next release time of the
-- selected set, on every request.
CREATE INDEX publications_fact_idx ON publications (fact_id) WHERE fact_id IS NOT NULL;
CREATE INDEX publications_selected_release_idx ON publications (visible_after) WHERE selected AND visibility = 'public';
