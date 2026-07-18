-- Create names table to store all baby names with metadata
CREATE TABLE public.names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'unisex')),
  origin TEXT,
  meaning TEXT,
  description TEXT,
  language TEXT DEFAULT 'en',
  region TEXT DEFAULT 'US',
  popularity_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(name, gender, language, region)
);

-- Create indexes for performance
CREATE INDEX idx_names_gender ON public.names(gender);
CREATE INDEX idx_names_language ON public.names(language);
CREATE INDEX idx_names_region ON public.names(region);
CREATE INDEX idx_names_active ON public.names(is_active);
CREATE INDEX idx_names_search ON public.names USING gin(to_tsvector('english', name || ' ' || COALESCE(meaning, '') || ' ' || COALESCE(description, '')));

-- Create admin_users table for admin access control
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Insert the admin user
INSERT INTO public.admin_users (email) VALUES ('idan.arbel@gmail.com');

-- Enable RLS on names table
ALTER TABLE public.names ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_users table  
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for names table
DROP POLICY IF EXISTS "Anyone can view active names" ON public.names;
CREATE POLICY "Anyone can view active names" ON public.names
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage all names" ON public.names;
CREATE POLICY "Admins can manage all names" ON public.names
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS policies for admin_users table
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users" ON public.admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;
CREATE POLICY "Admins can update admin users" ON public.admin_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = $1 AND is_active = true
  );
$$;

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_names_updated_at ON public.names;
CREATE TRIGGER update_names_updated_at
  BEFORE UPDATE ON public.names
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to populate names from existing data
CREATE OR REPLACE FUNCTION public.migrate_existing_names()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_record RECORD;
BEGIN
  -- Get unique names from user_swipes
  FOR name_record IN 
    SELECT DISTINCT 
      name,
      CASE 
        WHEN name ~ '^[א-ת]' THEN 'he'
        ELSE 'en'
      END as detected_language
    FROM public.user_swipes 
    WHERE name IS NOT NULL AND trim(name) != ''
  LOOP
    -- Insert name if it doesn't exist
    INSERT INTO public.names (name, gender, language, region, created_at)
    VALUES (
      name_record.name, 
      'unisex', -- Default gender, admin can update later
      name_record.detected_language,
      CASE WHEN name_record.detected_language = 'he' THEN 'IL' ELSE 'US' END,
      now()
    )
    ON CONFLICT (name, gender, language, region) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END;
$$;

-- Run the migration
SELECT public.migrate_existing_names();