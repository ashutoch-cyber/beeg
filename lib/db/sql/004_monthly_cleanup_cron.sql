-- Manual step required: run this in Supabase SQL Editor
-- Also enable pg_cron in Supabase Dashboard > Extensions > pg_cron
-- Run this once in Supabase SQL Editor to set up monthly cleanup
-- Requires pg_cron extension enabled in Supabase Dashboard -> Extensions

-- Remove existing job if it exists to avoid duplicates
SELECT cron.unschedule('delete-previous-month-food-logs')
WHERE EXISTS (
  SELECT 1 FROM cron.job
  WHERE jobname = 'delete-previous-month-food-logs'
);

-- Schedule: runs at 00:01 UTC on the 1st of every month
SELECT cron.schedule(
  'delete-previous-month-food-logs',
  '1 0 1 * *',
  $$
    DELETE FROM public.food_logs
    WHERE date < date_trunc('month', CURRENT_DATE)::date
    AND user_id IS NOT NULL;
  $$
);
