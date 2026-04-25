/*
  # Create Webhook Logs Table
  
  1. New Tables
    - `webhook_logs`
      - `id` (uuid, primary key)
      - `endpoint` (text) - Which endpoint was called
      - `method` (text) - HTTP method
      - `headers` (jsonb) - Request headers
      - `body` (jsonb) - Request body
      - `response_status` (integer) - HTTP response code
      - `response_body` (text) - Response content
      - `error` (text) - Any errors encountered
      - `created_at` (timestamptz) - When the request was received
      
  2. Security
    - Enable RLS on `webhook_logs` table
    - Add policy for authenticated users to view logs
    
  3. Notes
    - This table will help debug webhook issues
    - All webhook requests will be logged here
*/

CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  method text NOT NULL,
  headers jsonb DEFAULT '{}'::jsonb,
  body jsonb DEFAULT '{}'::jsonb,
  response_status integer,
  response_body text,
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert webhook logs"
  ON webhook_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_endpoint ON webhook_logs(endpoint);