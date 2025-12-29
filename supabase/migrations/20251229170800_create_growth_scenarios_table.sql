/*
  # Create Growth Scenarios Table for Runway DNA

  1. New Tables
    - `growth_scenarios`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, auto-generated)
      - `updated_at` (timestamptz, auto-updated)
      - `name` (text) - scenario name/label
      - `baseline_mrr` (numeric) - starting MRR
      - `growth_rate` (numeric) - monthly growth rate (decimal)
      - `churn_rate` (numeric) - monthly churn rate (decimal)
      - `expansion_rate` (numeric) - monthly expansion rate (decimal)
      - `contraction_rate` (numeric) - monthly contraction rate (downgrades, decimal)
      - `arpa` (numeric) - average revenue per account
      - `new_customers_per_month` (integer) - new customer acquisition
      - `target_arr` (numeric) - target ARR goal
      - `projection_months` (integer) - forecast horizon
      - `arr_12` (numeric) - projected 12-month ARR
      - `arr_24` (numeric) - projected 24-month ARR
      - `cagr_1y` (numeric) - 1-year CAGR
      - `cagr_2y` (numeric) - 2-year CAGR
      - `nrr` (numeric) - net revenue retention
      - `projection_data` (jsonb) - full 24-month breakdown
      - `metadata` (jsonb) - additional metadata

  2. Security
    - Enable RLS on `growth_scenarios` table
    - Add policy for public read/write access (no auth required for demo)

  3. Indexes
    - created_at DESC for recent scenarios
    - baseline_mrr for filtering
    
  4. MRR Waterfall Formula
    - EndingMRR = StartingMRR + New + Expansion - Churn - Contraction
*/

CREATE TABLE IF NOT EXISTS growth_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL DEFAULT 'Unnamed Scenario',
  baseline_mrr numeric NOT NULL DEFAULT 0,
  growth_rate numeric NOT NULL DEFAULT 0,
  churn_rate numeric NOT NULL DEFAULT 0,
  expansion_rate numeric NOT NULL DEFAULT 0,
  contraction_rate numeric NOT NULL DEFAULT 0,
  arpa numeric DEFAULT 500,
  new_customers_per_month integer DEFAULT 10,
  target_arr numeric DEFAULT 0,
  projection_months integer DEFAULT 24,
  arr_12 numeric,
  arr_24 numeric,
  cagr_1y numeric,
  cagr_2y numeric,
  nrr numeric,
  projection_data jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE growth_scenarios ENABLE ROW LEVEL SECURITY;

-- Public access policies (for demo - in production, scope to authenticated users)
CREATE POLICY "Allow public read access on growth_scenarios"
  ON growth_scenarios
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on growth_scenarios"
  ON growth_scenarios
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on growth_scenarios"
  ON growth_scenarios
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on growth_scenarios"
  ON growth_scenarios
  FOR DELETE
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_growth_scenarios_created_at ON growth_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_scenarios_baseline_mrr ON growth_scenarios(baseline_mrr);
CREATE INDEX IF NOT EXISTS idx_growth_scenarios_name ON growth_scenarios(name);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_growth_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER growth_scenarios_updated_at
  BEFORE UPDATE ON growth_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_growth_scenarios_updated_at();

