ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own food logs"
ON public.food_logs;

CREATE POLICY "Users can manage own food logs"
ON public.food_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
