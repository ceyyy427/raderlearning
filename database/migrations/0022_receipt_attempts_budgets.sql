-- Every request actually sent to a paid provider is one attempt. A receipt is the logical request
-- (reused on recovery); a retry after a rejection or an unusable answer is a new attempt of the same
-- receipt. Budgets and costs count attempts, so retries cannot slip past a budget and earlier billed
-- answers are not overwritten by later ones.
CREATE TABLE receipt_attempts (
  id           bigserial PRIMARY KEY,
  receipt_id   bigint NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
  attempt      integer NOT NULL,
  service      text NOT NULL,
  model        text,
  origin       text NOT NULL DEFAULT 'live' CHECK (origin IN ('live', 'replay', 'imported')),
  status       text NOT NULL CHECK (status IN ('pending', 'received', 'failed', 'unknown')),
  request_id   text,
  usage        jsonb,
  cost         numeric(14, 6),
  currency     text,
  cost_basis   text CHECK (cost_basis IN ('actual', 'estimated')),
  latency_ms   integer,
  error        text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  UNIQUE (receipt_id, attempt)
);

CREATE INDEX receipt_attempts_service_time_idx ON receipt_attempts (service, started_at);
CREATE INDEX receipt_attempts_pending_idx ON receipt_attempts (started_at) WHERE status = 'pending';

-- Existing receipts become one attempt each (earlier attempts of retried receipts were not kept).
INSERT INTO receipt_attempts (receipt_id, attempt, service, model, origin, status, request_id, usage, cost, currency, cost_basis, latency_ms, error, started_at, finished_at)
SELECT id, greatest(attempts, 1), service, model, origin,
       CASE status WHEN 'completed' THEN 'received' ELSE status END,
       request_id, usage, cost, currency, cost_basis,
       CASE WHEN jsonb_typeof(response->'_latencyMs') = 'number' THEN (response->>'_latencyMs')::numeric::integer END,
       error, created_at,
       CASE WHEN status = 'pending' THEN NULL ELSE coalesce(received_at, updated_at) END
FROM receipts;

-- Budget circuit breakers: per-request services at modest limits, model services well above normal
-- peaks so only runaway loops trip them. Operators tune them in the admin; a zero
-- stops a service. Existing rows are kept.
INSERT INTO budgets (service, per_minute, per_hour, per_day, note) VALUES
  ('jina', 5, 50, 300, '正文兜底（按请求计费）'),
  ('socialdata', 10, 100, 1000, 'X 搜索（按请求计费）'),
  ('dajiala', 5, 60, 500, '公众号列表与正文（按请求计费）'),
  ('zhipu', 100, 2000, 20000, '模型调用熔断（智谱）'),
  ('deepseek', 100, 2000, 20000, '模型调用熔断（DeepSeek）'),
  ('dashscope', 100, 2000, 20000, '模型与向量调用熔断（阿里云百炼）'),
  ('mimo', 100, 2000, 20000, '模型调用熔断（小米 MiMo）')
ON CONFLICT (service) DO NOTHING;
