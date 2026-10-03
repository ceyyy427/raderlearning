-- SelectBench: selection-model comparison runs on the human gold set, imported from
-- scripts/eval-selection.ts, browsable per case in the admin.
CREATE TABLE selectbench_runs (
  id text PRIMARY KEY,
  label text NOT NULL,
  split text,
  sample_size integer NOT NULL,
  seed integer,
  prompt_version text,
  models text[] NOT NULL,
  summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  imported_by text
);

CREATE TABLE selectbench_results (
  run_id text NOT NULL REFERENCES selectbench_runs (id) ON DELETE CASCADE,
  model text NOT NULL,
  case_id text NOT NULL,
  title text NOT NULL,
  stratum text,
  gold text NOT NULL,
  decision text,
  score integer,
  relevance text,
  category text,
  reason text,
  receipt_id bigint,
  error text,
  PRIMARY KEY (run_id, model, case_id)
);
