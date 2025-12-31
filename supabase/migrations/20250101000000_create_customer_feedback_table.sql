/*
  # Create Customer Feedback Table for Runway DNA

  1. New Tables
    - `customer_feedback`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, auto-generated)
      - `user_id` (uuid, references auth.users)
      - `feedback_text` (text) - customer feedback content
      - `source` (text) - where feedback came from (support, survey, review, etc.)
      - `rating` (integer) - optional rating (1-5)
      - `sentiment_score` (numeric) - calculated sentiment (-1 to 1)
      - `sentiment_label` (text) - 'positive', 'neutral', 'negative'
      - `metadata` (jsonb) - additional data

  2. Security
    - Enable RLS on `customer_feedback` table
    - Users can only see their own feedback

  3. Indexes
    - created_at DESC for recent feedback
    - sentiment_label for filtering
    - source for categorization
*/

CREATE TABLE IF NOT EXISTS customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_text text NOT NULL,
  source text DEFAULT 'support',
  rating integer CHECK (rating >= 1 AND rating <= 5),
  sentiment_score numeric DEFAULT 0,
  sentiment_label text CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON customer_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON customer_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON customer_feedback
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON customer_feedback
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at 
  ON customer_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_sentiment_label 
  ON customer_feedback(sentiment_label);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_source 
  ON customer_feedback(source);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_user_id 
  ON customer_feedback(user_id);

