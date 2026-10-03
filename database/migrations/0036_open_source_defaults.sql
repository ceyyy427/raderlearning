-- A new source shows a summary and the link to the original unless it is marked as allowing full text.
ALTER TABLE sources ALTER COLUMN site_fulltext SET DEFAULT false;

-- Circuit breakers for the deployment's own model (LLM_*) and embedding (EMBEDDING_*) services.
INSERT INTO budgets (service, per_minute, per_hour, per_day, note) VALUES
  ('llm', 300, 6000, 40000, '模型调用熔断（默认模型，所有步骤共用）'),
  ('embedding', 300, 6000, 40000, '向量调用熔断')
ON CONFLICT (service) DO NOTHING;
