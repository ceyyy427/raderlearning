-- One model per (source, alias): the fetchers record aliases idempotently.
CREATE UNIQUE INDEX lb_aliases_source_alias_key ON lb_aliases (source_key, alias);
