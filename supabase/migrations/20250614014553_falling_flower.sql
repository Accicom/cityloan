/*
  # Remove eligibility_score and eligibility_factors columns

  1. Changes
    - Remove `eligibility_score` column from assessments table
    - Remove `eligibility_factors` column from assessments table
    - Remove related constraints

  These fields are no longer needed as we now use BCRA-based assessment only.
*/

-- Remove the check constraint for eligibility_score
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_eligibility_score_check;

-- Remove the eligibility_score column
ALTER TABLE assessments DROP COLUMN IF EXISTS eligibility_score;

-- Remove the eligibility_factors column
ALTER TABLE assessments DROP COLUMN IF EXISTS eligibility_factors;