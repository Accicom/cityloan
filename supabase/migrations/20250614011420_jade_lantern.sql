/*
  # Add BCRA fields to assessments table

  1. New Columns
    - `bcra_debt_data` (jsonb) - Current BCRA debt information
    - `bcra_historical_data` (jsonb) - Historical BCRA data (24 months)
    - `bcra_eligibility_status` (text) - BCRA eligibility status (BCRA_APTO, BCRA_NO_APTO, BCRA_PENDING)

  2. Updates
    - Add check constraint for bcra_eligibility_status values
    - Add indexes for better query performance
*/

-- Add new columns to assessments table
DO $$
BEGIN
  -- Add bcra_debt_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'bcra_debt_data'
  ) THEN
    ALTER TABLE assessments ADD COLUMN bcra_debt_data jsonb;
  END IF;

  -- Add bcra_historical_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'bcra_historical_data'
  ) THEN
    ALTER TABLE assessments ADD COLUMN bcra_historical_data jsonb;
  END IF;

  -- Add bcra_eligibility_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'bcra_eligibility_status'
  ) THEN
    ALTER TABLE assessments ADD COLUMN bcra_eligibility_status text;
  END IF;
END $$;

-- Add check constraint for bcra_eligibility_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'assessments_bcra_eligibility_status_check'
  ) THEN
    ALTER TABLE assessments ADD CONSTRAINT assessments_bcra_eligibility_status_check 
    CHECK (bcra_eligibility_status IS NULL OR bcra_eligibility_status IN ('BCRA_APTO', 'BCRA_NO_APTO', 'BCRA_PENDING'));
  END IF;
END $$;

-- Add index for bcra_eligibility_status
CREATE INDEX IF NOT EXISTS idx_assessments_bcra_status 
  ON assessments(bcra_eligibility_status);

-- Add index for bcra data queries
CREATE INDEX IF NOT EXISTS idx_assessments_bcra_data 
  ON assessments USING GIN (bcra_debt_data);

CREATE INDEX IF NOT EXISTS idx_assessments_bcra_historical 
  ON assessments USING GIN (bcra_historical_data);