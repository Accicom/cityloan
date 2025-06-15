/*
  # Fix ambiguous column reference in generate_operation_number function

  1. Function Updates
    - Update the `generate_operation_number` function to properly qualify column references
    - Ensure no naming conflicts between variables and table columns
  
  2. Changes Made
    - Qualify `operation_number` column references with table name `loan_operations.operation_number`
    - Rename function variables if needed to avoid conflicts
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS generate_operation_number();

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION generate_operation_number()
RETURNS TEXT AS $$
DECLARE
    new_operation_number TEXT;
    counter INTEGER := 1;
    base_number TEXT;
BEGIN
    -- Generate base number using current date
    base_number := 'OP' || TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Start with the base number + counter
    new_operation_number := base_number || LPAD(counter::TEXT, 4, '0');
    
    -- Keep incrementing until we find a unique number
    WHILE EXISTS (
        SELECT 1 FROM loan_operations 
        WHERE loan_operations.operation_number = new_operation_number
    ) LOOP
        counter := counter + 1;
        new_operation_number := base_number || LPAD(counter::TEXT, 4, '0');
    END LOOP;
    
    RETURN new_operation_number;
END;
$$ LANGUAGE plpgsql;