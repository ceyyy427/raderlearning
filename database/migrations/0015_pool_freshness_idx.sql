-- The pool's freshness (newest change among eligible items) is read on every /all page.
CREATE INDEX publications_eligible_updated_idx ON publications (updated_at) WHERE eligible;
