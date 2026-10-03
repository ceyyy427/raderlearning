-- Unit prices for estimating variable costs from receipts. Entered by an operator
-- from the provider's price page; costs computed from them are shown as estimates, apart from bills.
CREATE TABLE service_prices (
  service text NOT NULL,
  model text NOT NULL DEFAULT '',
  currency text NOT NULL CHECK (currency IN ('CNY', 'USD')),
  input_per_mtok numeric(14, 6),
  cached_per_mtok numeric(14, 6),
  output_per_mtok numeric(14, 6),
  per_request numeric(14, 6),
  source_url text,
  verified_on date,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service, model)
);
