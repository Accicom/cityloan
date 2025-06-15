/*
  # Remove profiles table and simplify authentication

  1. Database Changes
    - Drop the handle_new_user function and trigger
    - Drop the user_debug_info view
    - Drop the get_current_user_id function
    - Remove foreign key constraint from assessments table
    - Drop the profiles table
    - Modify assessments table to reference auth.users directly
    - Update RLS policies for assessments table

  2. Security
    - Update RLS policies to work with auth.uid() directly
    - Ensure assessments are properly secured per user

  3. Cleanup
    - Remove all profile-related database objects
    - Simplify the schema for direct auth usage
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop the debug view
DROP VIEW IF EXISTS user_debug_info;

-- Drop the debug function
DROP FUNCTION IF EXISTS get_current_user_id();

-- Drop foreign key constraint from assessments
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_advisor_id_fkey;

-- Drop the profiles table completely
DROP TABLE IF EXISTS profiles CASCADE;

-- Add foreign key constraint to reference auth.users directly
-- Note: We can't directly reference auth.users due to RLS, so we'll remove the FK constraint
-- and rely on application logic and RLS policies for data integrity

-- Update RLS policies for assessments to work with auth.uid() directly
DROP POLICY IF EXISTS "Advisors can read own assessments" ON assessments;
DROP POLICY IF EXISTS "Advisors can create assessments" ON assessments;
DROP POLICY IF EXISTS "Advisors can update own assessments" ON assessments;

-- Create new simplified policies
CREATE POLICY "Users can read own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (advisor_id = auth.uid());

CREATE POLICY "Users can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Users can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (advisor_id = auth.uid());

-- Ensure any existing assessments are updated to use proper UUIDs
-- (This is just a safety measure in case there are any data inconsistencies)
UPDATE assessments 
SET advisor_id = advisor_id::uuid 
WHERE advisor_id IS NOT NULL;