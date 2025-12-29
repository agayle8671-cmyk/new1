/*
  # Create DNA Snapshots Table for Runway DNA

  1. New Tables
    - `dna_snapshots`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, auto-generated)
      - `snapshot_type` (text) - 'analysis' or 'simulation'
      - `grade` (text) - A, B, C, D, F
      - `runway_months` (numeric)
      - `monthly_burn` (numeric)
      - `monthly_revenue` (numeric)
      - `cash_on_hand` (numeric)
      - `profit_margin` (numeric)
      - `burn_multiple` (numeric)
      - `revenue_growth` (numeric)
      - `expense_growth` (numeric)
      - `insight` (text)
      - `revenue_trend` (jsonb) - array of monthly data
      - `projection_data` (jsonb) - 24-month simulation projection
      - `scenario_params` (jsonb) - simulation parameters
      - `metadata` (jsonb) - additional metadata

  2. Security
    - Enable RLS on `dna_snapshots` table
    - Add policy for public read/write access (no auth required for demo)
*/

CREATE TABLE IF NOT EXISTS dna_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  snapshot_type text NOT NULL DEFAULT 'analysis',
  grade text,
  runway_months numeric,
  monthly_burn numeric,
  monthly_revenue numeric,
  cash_on_hand numeric,
  profit_margin numeric,
  burn_multiple numeric,
  revenue_growth numeric,
  expense_growth numeric,
  insight text,
  revenue_trend jsonb DEFAULT '[]'::jsonb,
  projection_data jsonb DEFAULT '[]'::jsonb,
  scenario_params jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE dna_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on dna_snapshots"
  ON dna_snapshots
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on dna_snapshots"
  ON dna_snapshots
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on dna_snapshots"
  ON dna_snapshots
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on dna_snapshots"
  ON dna_snapshots
  FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_dna_snapshots_created_at ON dna_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dna_snapshots_type ON dna_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_dna_snapshots_grade ON dna_snapshots(grade);
