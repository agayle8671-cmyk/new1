/*
  # Create Alert History Table for Runway DNA

  1. New Tables
    - `alert_history`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, auto-generated)
      - `alert_type` (text) - type of alert (runway_critical, burn_spike, etc.)
      - `severity` (text) - info, warning, critical
      - `title` (text) - alert title
      - `description` (text) - detailed description
      - `runway_months` (numeric) - runway at time of alert
      - `health_grade` (text) - A, B, or C
      - `metadata` (jsonb) - additional alert data
      - `acknowledged` (boolean) - whether alert was dismissed
      - `acknowledged_at` (timestamptz) - when alert was acknowledged

  2. Security
    - Enable RLS on `alert_history` table
    - Add policy for public read/write access (demo mode)

  3. Indexes
    - created_at DESC for recent alerts
    - alert_type for filtering
    - severity for priority sorting

  4. Purpose
    - Track timeline of runway risks
    - Log critical alerts for founder review
    - Historical record of burn spikes and health changes
*/

CREATE TABLE IF NOT EXISTS alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  description text,
  runway_months numeric,
  health_grade text CHECK (health_grade IN ('A', 'B', 'C')),
  metadata jsonb DEFAULT '{}'::jsonb,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Public access policies (for demo - in production, scope to authenticated users)
CREATE POLICY "Allow public read access on alert_history"
  ON alert_history
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on alert_history"
  ON alert_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on alert_history"
  ON alert_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on alert_history"
  ON alert_history
  FOR DELETE
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_type ON alert_history(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON alert_history(acknowledged);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_alert_history_unacknowledged 
  ON alert_history(created_at DESC) 
  WHERE acknowledged = false;

-- Function to auto-update acknowledged_at when acknowledged changes
CREATE OR REPLACE FUNCTION update_alert_acknowledged_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.acknowledged = true AND OLD.acknowledged = false THEN
    NEW.acknowledged_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_acknowledged_at_trigger
  BEFORE UPDATE ON alert_history
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_acknowledged_at();



