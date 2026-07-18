-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  preferences JSONB DEFAULT '{"gender": "unknown", "country": "", "language": ""}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create partnerships table
CREATE TABLE public.partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')) DEFAULT 'pending',
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on partnerships
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

-- Create policies for partnerships
DROP POLICY IF EXISTS "Users can view their own partnerships" ON public.partnerships;
CREATE POLICY "Users can view their own partnerships" 
ON public.partnerships 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create partnerships" ON public.partnerships;
CREATE POLICY "Users can create partnerships" 
ON public.partnerships 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id);

DROP POLICY IF EXISTS "Users can update partnerships they're part of" ON public.partnerships;
CREATE POLICY "Users can update partnerships they're part of" 
ON public.partnerships 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create user_swipes table
CREATE TABLE public.user_swipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES public.partnerships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_swipes
ALTER TABLE public.user_swipes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_swipes
DROP POLICY IF EXISTS "Users can view their own swipes" ON public.user_swipes;
CREATE POLICY "Users can view their own swipes" 
ON public.user_swipes 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own swipes" ON public.user_swipes;
CREATE POLICY "Users can insert their own swipes" 
ON public.user_swipes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, preferences)
  VALUES (
    NEW.id, 
    NEW.email,
    '{"gender": "unknown", "country": "", "language": ""}'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to create partnership notification
CREATE OR REPLACE FUNCTION public.notify_partner_joined()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify user1 when user2 joins
  IF OLD.user2_id IS NULL AND NEW.user2_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user1_id,
      'partner_joined',
      'Partner Joined!',
      'Your partner has joined and you can now start finding baby names together!'
    );
    
    -- Also notify the new partner
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user2_id,
      'partnership_active',
      'Partnership Active!',
      'You''ve successfully joined a partnership! Start swiping to find baby names.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for partnership notifications
DROP TRIGGER IF EXISTS on_partnership_updated ON public.partnerships;
CREATE TRIGGER on_partnership_updated
  AFTER UPDATE ON public.partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_partner_joined();