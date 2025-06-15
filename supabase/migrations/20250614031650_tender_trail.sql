/*
  # Fix generate_operation_number function

  1. Database Functions
    - Create or replace the `generate_operation_number` function
    - Fix ambiguous column reference by properly qualifying table references
    - Ensure the function generates unique operation numbers

  2. Security
    - Function is accessible to authenticated users
    - Uses proper table qualification to avoid ambiguity
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_operation_number();

-- Create the generate_operation_number function with proper column qualification
CREATE OR REPLACE FUNCTION generate_operation_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER := 1;
  base_number TEXT;
BEGIN
  -- Generate base number using current date and time
  base_number := 'LO' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(EXTRACT(EPOCH FROM NOW())::INTEGER % 10000, 4, '0');
  
  -- Start with the base number
  new_number := base_number;
  
  -- Check if this number already exists and increment if needed
  WHILE EXISTS (
    SELECT 1 
    FROM loan_operations lo 
    WHERE lo.operation_number = new_number
  ) LOOP
    new_number := base_number || '-' || LPAD(counter::TEXT, 3, '0');
    counter := counter + 1;
  END LOOP;
  
  RETURN new_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_operation_number() TO authenticated;