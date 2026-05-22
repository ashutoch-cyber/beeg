-- Run in Supabase SQL Editor
-- Adds optional ingredients breakdown column to food_logs
-- This is non-destructive: existing rows will have NULL here

ALTER TABLE public.food_logs
ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT NULL;
