-- Requires pg_cron enabled in Supabase (Dashboard -> Extensions)
SELECT cron.schedule(
  'delete-previous-month-food-logs',
  '1 0 1 * *',
  $$
    DELETE FROM public.food_logs
    WHERE logged_at < date_trunc('month', now())
    AND user_id IS NOT NULL;
  $$
);
