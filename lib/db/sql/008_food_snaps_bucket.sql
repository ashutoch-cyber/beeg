-- Run in Supabase SQL Editor
-- Creates storage bucket for food snap images

INSERT INTO storage.buckets (id, name, public)
VALUES ('food-snaps', 'food-snaps', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Food snap upload policy" ON storage.objects;
CREATE POLICY "Food snap upload policy"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'food-snaps' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Food snap read policy" ON storage.objects;
CREATE POLICY "Food snap read policy"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'food-snaps');

DROP POLICY IF EXISTS "Food snap delete policy" ON storage.objects;
CREATE POLICY "Food snap delete policy"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'food-snaps' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
