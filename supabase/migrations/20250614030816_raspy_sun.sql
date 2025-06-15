/*
  # Create loan operations system

  1. New Tables
    - `loan_operations`
      - `id` (uuid, primary key)
      - `operation_number` (text, unique)
      - `assessment_id` (uuid, foreign key to assessments)
      - `advisor_id` (uuid, foreign key to users)
      - `client_cuit` (text)
      - `client_name` (text)
      - `status` (enum: pending, in_progress, completed, rejected)
      - `current_stage` (enum: contact_info, documents, veraz_data, verification)
      - `contact_info` (jsonb)
      - `documents` (jsonb)
      - `veraz_data` (jsonb)
      - `verification_data` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `loan_operations` table
    - Add policies for authenticated users to manage their operations
*/

-- Create enum types for loan operations
CREATE TYPE loan_operation_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');
CREATE TYPE loan_operation_stage AS ENUM ('contact_info', 'documents', 'veraz_data', 'verification');

-- Create loan_operations table
CREATE TABLE IF NOT EXISTS loan_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_number text UNIQUE NOT NULL,
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL,
  client_cuit text NOT NULL,
  client_name text,
  status loan_operation_status DEFAULT 'pending',
  current_stage loan_operation_stage DEFAULT 'contact_info',
  contact_info jsonb DEFAULT '{}',
  documents jsonb DEFAULT '{}',
  veraz_data jsonb DEFAULT '{}',
  verification_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loan_operations_advisor_id ON loan_operations(advisor_id);
CREATE INDEX IF NOT EXISTS idx_loan_operations_assessment_id ON loan_operations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_loan_operations_status ON loan_operations(status);
CREATE INDEX IF NOT EXISTS idx_loan_operations_operation_number ON loan_operations(operation_number);
CREATE INDEX IF NOT EXISTS idx_loan_operations_client_cuit ON loan_operations(client_cuit);

-- Enable RLS
ALTER TABLE loan_operations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own loan operations"
  ON loan_operations
  FOR SELECT
  TO authenticated
  USING (advisor_id = auth.uid());

CREATE POLICY "Users can create loan operations"
  ON loan_operations
  FOR INSERT
  TO authenticated
  WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Users can update own loan operations"
  ON loan_operations
  FOR UPDATE
  TO authenticated
  USING (advisor_id = auth.uid())
  WITH CHECK (advisor_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_loan_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loan_operations_updated_at
  BEFORE UPDATE ON loan_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_operations_updated_at();

-- Function to generate operation number
CREATE OR REPLACE FUNCTION generate_operation_number()
RETURNS text AS $$
DECLARE
  operation_number text;
  counter integer;
BEGIN
  -- Get current date in YYYYMMDD format
  operation_number := 'OP' || to_char(now(), 'YYYYMMDD') || '-';
  
  -- Get the count of operations created today
  SELECT COUNT(*) + 1 INTO counter
  FROM loan_operations
  WHERE operation_number LIKE operation_number || '%';
  
  -- Append counter with leading zeros
  operation_number := operation_number || lpad(counter::text, 4, '0');
  
  RETURN operation_number;
END;
$$ LANGUAGE plpgsql;