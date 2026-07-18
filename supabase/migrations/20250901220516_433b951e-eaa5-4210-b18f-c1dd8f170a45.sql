-- Add name fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN partner_name TEXT;

-- Add admin tracking to partnerships (user1_id is the creator/admin)
ALTER TABLE public.partnerships 
ADD COLUMN admin_user_id UUID REFERENCES auth.users(id);

-- Update existing partnerships to set admin_user_id to user1_id
UPDATE public.partnerships SET admin_user_id = user1_id WHERE admin_user_id IS NULL;