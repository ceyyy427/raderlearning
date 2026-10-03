-- contentPublic was an older flag for showing and syndicating full text; the import turned it
-- into sources.syndicate_fulltext. The collectors now refuse config keys they do not implement, so the
-- leftover key goes.
UPDATE sources SET config = config - 'contentPublic' WHERE config ? 'contentPublic';
