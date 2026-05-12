-- Useful Beeg SQL queries.
-- Replace :user_id and other :placeholders with real values when running manually.

-- Check whether required tables exist.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'daily_goals',
    'food_logs',
    'food_ingredients',
    'scan_usage',
    'user_settings'
  )
order by table_name;

-- Get the current user's dashboard totals for today.
select
  coalesce(sum(calories), 0) as calories,
  coalesce(sum(protein), 0) as protein,
  coalesce(sum(carbs), 0) as carbs,
  coalesce(sum(fat), 0) as fat
from public.food_logs
where user_id = :user_id
  and date = current_date;

-- Upsert daily nutrition goals.
insert into public.daily_goals (user_id, calories, protein, carbs, fat, fibre)
values (:user_id, :calories, :protein, :carbs, :fat, :fibre)
on conflict (user_id) do update set
  calories = excluded.calories,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fat = excluded.fat,
  fibre = excluded.fibre,
  updated_at = now()
returning *;

-- Insert one scanned meal and its ingredient breakdown.
with new_log as (
  insert into public.food_logs (
    user_id,
    date,
    meal_type,
    dish_name,
    image_uri,
    calories,
    protein,
    carbs,
    fat
  )
  values (
    :user_id,
    :date,
    :meal_type::public.meal_type,
    :dish_name,
    :image_uri,
    :calories,
    :protein,
    :carbs,
    :fat
  )
  returning id
)
insert into public.food_ingredients (
  food_log_id,
  name,
  serving,
  calories,
  protein,
  carbs,
  fat,
  position
)
select
  new_log.id,
  ingredient.name,
  ingredient.serving,
  ingredient.calories,
  ingredient.protein,
  ingredient.carbs,
  ingredient.fat,
  ingredient.position
from new_log
cross join jsonb_to_recordset(:ingredients::jsonb) as ingredient(
  name text,
  serving text,
  calories double precision,
  protein double precision,
  carbs double precision,
  fat double precision,
  position integer
)
returning *;

-- Fetch meal logs with ingredient rows for a user.
select
  fl.*,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', fi.id,
        'name', fi.name,
        'serving', fi.serving,
        'calories', fi.calories,
        'protein', fi.protein,
        'carbs', fi.carbs,
        'fat', fi.fat,
        'position', fi.position
      )
      order by fi.position
    ) filter (where fi.id is not null),
    '[]'::jsonb
  ) as ingredients
from public.food_logs fl
left join public.food_ingredients fi on fi.food_log_id = fl.id
where fl.user_id = :user_id
group by fl.id
order by fl.logged_at desc;

-- Increment today's scan counter.
insert into public.scan_usage (user_id, scan_date, count)
values (:user_id, current_date, 1)
on conflict (user_id, scan_date) do update set
  count = public.scan_usage.count + 1,
  updated_at = now()
returning *;

-- Update the user's monthly scan limit.
insert into public.user_settings (user_id, scan_limit)
values (:user_id, :scan_limit)
on conflict (user_id) do update set
  scan_limit = excluded.scan_limit,
  updated_at = now()
returning *;

-- Delete a meal log. Ingredients are removed automatically by cascade.
delete from public.food_logs
where id = :food_log_id
  and user_id = :user_id;
