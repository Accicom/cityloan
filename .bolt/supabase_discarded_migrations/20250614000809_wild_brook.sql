/*
  # Create Demo User for Testing

  1. Demo User Creation
    - Create a demo advisor user for testing
    - Email: advisor@example.com
    - Password will be set through Supabase Auth

  2. Profile Setup
    - Create corresponding profile entry
    - Set role as 'advisor'
    - Add sample data for testing
*/

-- Insert demo profile (the user will be created through Supabase Auth)
-- This is a placeholder - the actual user creation needs to be done through Supabase Auth UI

-- Create a sample assessment for demo purposes
DO $$
DECLARE
    demo_user_id uuid;
BEGIN
    -- Check if demo user profile exists, if not we'll create a placeholder
    -- In production, this would be handled by the auth trigger
    
    -- For now, let's create some sample data structure
    -- The actual user creation should be done through Supabase Auth dashboard
    
    NULL; -- Placeholder for now
END $$;