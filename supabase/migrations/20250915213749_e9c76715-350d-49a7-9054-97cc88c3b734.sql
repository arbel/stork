-- Clean up orphaned swipes that reference names not in the current names table
DELETE FROM public.user_swipes 
WHERE name NOT IN (
  SELECT name FROM public.names WHERE is_active = true
);