/*
  # Fix generate_operation_number function

  1. Database Functions
    - Drop existing generate_operation_number function if it exists
    - Create new generate_operation_number function with proper type casting
    - Function generates operation numbers in format: LO-YYYYMMDD-NNNN
  
  2. Function Details
    - Uses current date for YYYYMMDD part
    - Finds next sequential number for the day
    - Properly casts string literals to text type for lpad function
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_operation_number();

-- Create the generate_operation_number function with proper type casting
CREATE OR REPLACE FUNCTION generate_operation_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  date_part text;
  sequence_number integer;
  operation_number text;
BEGIN
  -- Get current date in YYYYMMDD format
  date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Find the next sequence number for today
  SELECT COALESCE(MAX(
    CASE 
      WHEN operation_number ~ ('^LO-' || date_part || '-[0-9]{4}$')
      THEN CAST(RIGHT(operation_number, 4) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_number
  FROM loan_operations
  WHERE operation_number LIKE 'LO-' || date_part || '-%';
  
  -- Generate the operation number with proper type casting
  operation_number := 'LO-' || date_part || '-' || lpad(sequence_number::text, 4, '0'::text);
  
  RETURN operation_number;
END;
$$;