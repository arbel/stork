-- First, delete duplicate swipes keeping only the earliest one
DELETE FROM user_swipes a
USING user_swipes b
WHERE a.user_id = b.user_id 
  AND a.name = b.name 
  AND a.action = b.action
  AND (a.partnership_id = b.partnership_id OR (a.partnership_id IS NULL AND b.partnership_id IS NULL))
  AND a.created_at > b.created_at;

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS user_swipes_unique_name_action 
ON user_swipes (user_id, name, action, COALESCE(partnership_id, '00000000-0000-0000-0000-000000000000'));