/*
  # Create AI Metrics Table for Runway DNA

  1. New Tables
    - `ai_metrics`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, auto-generated)
      - `user_id` (uuid, references auth.users)
      - `query_text` (text) - the user's question
      - `response_time_ms` (numeric) - time taken to respond
      - `function_calls_used` (integer) - number of function calls made
      - `cache_hit` (boolean) - whether response was from cache
      - `cost_estimate` (numeric) - estimated API cost in USD
      - `satisfaction_score` (numeric) - user satisfaction (1-5, optional)
      - `metadata` (jsonb) - additional data

  2. Security
    - Enable RLS on `ai_metrics` table
    - Users can only see their own metrics

  3. Indexes
    - created_at DESC for recent queries
    - query_text for searching top questions
    - cache_hit for cache hit rate analysis
*/

CREATE TABLE IF NOT EXISTS ai_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  response_time_ms numeric NOT NULL,
  function_calls_used integer DEFAULT 0,
  cache_hit boolean DEFAULT false,
  cost_estimate numeric DEFAULT 0,
  satisfaction_score numeric CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own metrics
CREATE POLICY "Users can view own metrics"
  ON ai_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own metrics
CREATE POLICY "Users can insert own metrics"
  ON ai_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own metrics (for satisfaction scores)
CREATE POLICY "Users can update own metrics"
  ON ai_metrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_metrics_created_at 
  ON ai_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_user_id 
  ON ai_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_cache_hit 
  ON ai_metrics(cache_hit);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_query_text 
  ON ai_metrics(query_text);

