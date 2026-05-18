ALTER TABLE public.food_logs
DROP CONSTRAINT IF EXISTS food_logs_meal_type_check;

ALTER TABLE public.food_logs
ADD CONSTRAINT food_logs_meal_type_check
CHECK (lower(meal_type::text) IN ('breakfast','lunch','dinner','snack'));
