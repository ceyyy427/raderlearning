-- Selection scores are now the mean of independent score calls (editorial/analyze.ts), so SelectBench
-- keeps them with the same precision as analyses.score.
ALTER TABLE selectbench_results ALTER COLUMN score TYPE numeric(5, 2);
