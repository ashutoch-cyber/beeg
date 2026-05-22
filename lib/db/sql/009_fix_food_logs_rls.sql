-- Run this in Supabase SQL Editor
-- Then verify in Dashboard -> Authentication -> Policies -> food_logs

-- Ensure RLS is enabled
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies cleanly
DROP POLICY IF EXISTS "Users can manage own food logs"
  ON public.food_logs;
DROP POLICY IF EXISTS "Users can insert own food logs"
  ON public.food_logs;
DROP POLICY IF EXISTS "Users can select own food logs"
  ON public.food_logs;

-- Single policy covering all operations
CREATE POLICY "Users can manage own food logs"
ON public.food_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
