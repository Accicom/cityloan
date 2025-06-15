-- Create the loan-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Users can upload loan documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'loan-documents');

-- Create policy to allow authenticated users to view their own files
CREATE POLICY "Users can view own loan documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'loan-documents');

-- Create policy to allow authenticated users to update their own files
CREATE POLICY "Users can update own loan documents" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'loan-documents');

-- Create policy to allow authenticated users to delete their own files
CREATE POLICY "Users can delete own loan documents" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'loan-documents');