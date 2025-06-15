/*
  # Loan Assessment Portal Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text, advisor/admin)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `assessments`
      - `id` (uuid, primary key)
      - `advisor_id` (uuid, references profiles)
      - `client_cuit` (text)
      - `client_name` (text, optional)
      - `assessment_result` (text, eligible/not_eligible/pending)
      - `eligibility_score` (integer, 0-100)
      - `eligibility_factors` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Add admin policies for assessments table

  3. Performance
    - Add indexes for common queries
    - Add triggers for automatic updated_at timestamps
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'advisor' CHECK (role IN ('advisor', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_cuit text NOT NULL,
  client_name text,
  assessment_result text NOT NULL CHECK (assessment_result IN ('eligible', 'not_eligible', 'pending')),
  eligibility_score integer NOT NULL CHECK (eligibility_score >= 0 AND eligibility_score <= 100),
  eligibility_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for assessments
CREATE POLICY "Advisors can read own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    advisor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Advisors can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Advisors can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    advisor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_advisor_created 
  ON assessments(advisor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_cuit 
  ON assessments(client_cuit);

CREATE INDEX IF NOT EXISTS idx_assessments_result 
  ON assessments(assessment_result);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON profiles(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'advisor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();