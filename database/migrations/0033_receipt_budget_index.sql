-- The budget check before every paid call counts a service's live attempts of the last day
-- (providers/receipts.ts checkBudget). With `origin` in the index the count is read from the index
-- instead of visiting every attempt of the day in the table. The index keeps its name.
DROP INDEX IF EXISTS receipt_attempts_service_time_idx;
CREATE INDEX receipt_attempts_service_time_idx ON receipt_attempts (service, origin, started_at);
