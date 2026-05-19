-- Manual step: Run this in Supabase SQL Editor
-- Then verify bucket appears in Supabase Dashboard -> Storage
-- Creates a public storage bucket for avatar images

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
CREATE POLICY "Avatar upload policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
CREATE POLICY "Avatar update policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to read avatars (public bucket)
DROP POLICY IF EXISTS "Avatar read policy" ON storage.objects;
CREATE POLICY "Avatar read policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
