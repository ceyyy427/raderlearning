-- Why a feedback has not reached the internal Feishu chat yet ('pending' before the first try), so the
-- forwarding sweep tries it again.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS forward_error text;
