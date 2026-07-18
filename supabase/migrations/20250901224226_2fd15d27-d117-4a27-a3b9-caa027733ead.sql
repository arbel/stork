-- Create name_similarities table to store relationships between names that are often liked together
CREATE TABLE public.name_similarities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name1 TEXT NOT NULL,
  name2 TEXT NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  co_occurrence_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name1, name2)
);

-- Create user_similarities table to store similarity scores between users
CREATE TABLE public.user_similarities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  common_likes_count INTEGER NOT NULL DEFAULT 0,
  total_user1_likes INTEGER NOT NULL DEFAULT 0,
  total_user2_likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create name_recommendations table to cache recommendations for users
CREATE TABLE public.name_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommended_name TEXT NOT NULL,
  recommendation_score DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  recommendation_type TEXT NOT NULL DEFAULT 'collaborative', -- 'collaborative', 'popular', 'similar_names'
  based_on_users TEXT[], -- Array of similar user IDs this recommendation is based on
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recommended_name)
);

-- Enable RLS on all new tables
ALTER TABLE public.name_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.name_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for name_similarities (readable by all authenticated users)
DROP POLICY IF EXISTS "Anyone can view name similarities" ON public.name_similarities;
CREATE POLICY "Anyone can view name similarities" 
ON public.name_similarities 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- RLS policies for user_similarities (users can view their own similarities)
DROP POLICY IF EXISTS "Users can view their own similarities" ON public.user_similarities;
CREATE POLICY "Users can view their own similarities" 
ON public.user_similarities 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS policies for name_recommendations (users can view their own recommendations)
DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.name_recommendations;
CREATE POLICY "Users can view their own recommendations" 
ON public.name_recommendations 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON public.name_recommendations;
CREATE POLICY "Users can insert their own recommendations" 
ON public.name_recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommendations" ON public.name_recommendations;
CREATE POLICY "Users can update their own recommendations" 
ON public.name_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_name_similarities_name1 ON public.name_similarities(name1);
CREATE INDEX idx_name_similarities_name2 ON public.name_similarities(name2);
CREATE INDEX idx_name_similarities_score ON public.name_similarities(similarity_score DESC);

CREATE INDEX idx_user_similarities_user1 ON public.user_similarities(user1_id);
CREATE INDEX idx_user_similarities_user2 ON public.user_similarities(user2_id);
CREATE INDEX idx_user_similarities_score ON public.user_similarities(similarity_score DESC);

CREATE INDEX idx_name_recommendations_user ON public.name_recommendations(user_id);
CREATE INDEX idx_name_recommendations_score ON public.name_recommendations(recommendation_score DESC);
CREATE INDEX idx_name_recommendations_type ON public.name_recommendations(recommendation_type);

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_name_similarities_updated_at ON public.name_similarities;
CREATE TRIGGER update_name_similarities_updated_at
BEFORE UPDATE ON public.name_similarities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_similarities_updated_at ON public.user_similarities;
CREATE TRIGGER update_user_similarities_updated_at
BEFORE UPDATE ON public.user_similarities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_name_recommendations_updated_at ON public.name_recommendations;
CREATE TRIGGER update_name_recommendations_updated_at
BEFORE UPDATE ON public.name_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate and update user similarities
CREATE OR REPLACE FUNCTION calculate_user_similarities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  other_user_record RECORD;
  common_likes INTEGER;
  user1_total INTEGER;
  user2_total INTEGER;
  jaccard_similarity DECIMAL(5,4);
BEGIN
  -- Clear existing similarities
  DELETE FROM public.user_similarities;
  
  -- Calculate similarities between all user pairs
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.user_swipes WHERE action = 'like'
  LOOP
    FOR other_user_record IN 
      SELECT DISTINCT user_id FROM public.user_swipes 
      WHERE action = 'like' AND user_id > user_record.user_id
    LOOP
      -- Count common likes
      SELECT COUNT(*) INTO common_likes
      FROM public.user_swipes u1
      JOIN public.user_swipes u2 ON u1.name = u2.name
      WHERE u1.user_id = user_record.user_id 
        AND u2.user_id = other_user_record.user_id
        AND u1.action = 'like' 
        AND u2.action = 'like';
      
      -- Count total likes for each user
      SELECT COUNT(*) INTO user1_total
      FROM public.user_swipes
      WHERE user_id = user_record.user_id AND action = 'like';
      
      SELECT COUNT(*) INTO user2_total
      FROM public.user_swipes
      WHERE user_id = other_user_record.user_id AND action = 'like';
      
      -- Calculate Jaccard similarity (common / union)
      IF (user1_total + user2_total - common_likes) > 0 THEN
        jaccard_similarity := common_likes::DECIMAL / (user1_total + user2_total - common_likes);
      ELSE
        jaccard_similarity := 0;
      END IF;
      
      -- Only store if there's some similarity
      IF common_likes > 0 THEN
        INSERT INTO public.user_similarities (
          user1_id, user2_id, similarity_score, common_likes_count, 
          total_user1_likes, total_user2_likes
        ) VALUES (
          user_record.user_id, other_user_record.user_id, jaccard_similarity,
          common_likes, user1_total, user2_total
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Function to calculate name co-occurrences and similarities
CREATE OR REPLACE FUNCTION calculate_name_similarities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  name_record RECORD;
  other_name_record RECORD;
  co_occurrence INTEGER;
  name1_users INTEGER;
  name2_users INTEGER;
  jaccard_similarity DECIMAL(5,4);
BEGIN
  -- Clear existing similarities
  DELETE FROM public.name_similarities;
  
  -- Calculate similarities between all name pairs
  FOR name_record IN 
    SELECT DISTINCT name FROM public.user_swipes WHERE action = 'like'
  LOOP
    FOR other_name_record IN 
      SELECT DISTINCT name FROM public.user_swipes 
      WHERE action = 'like' AND name > name_record.name
    LOOP
      -- Count users who liked both names
      SELECT COUNT(DISTINCT u1.user_id) INTO co_occurrence
      FROM public.user_swipes u1
      JOIN public.user_swipes u2 ON u1.user_id = u2.user_id
      WHERE u1.name = name_record.name 
        AND u2.name = other_name_record.name
        AND u1.action = 'like' 
        AND u2.action = 'like';
      
      -- Count total users who liked each name
      SELECT COUNT(DISTINCT user_id) INTO name1_users
      FROM public.user_swipes
      WHERE name = name_record.name AND action = 'like';
      
      SELECT COUNT(DISTINCT user_id) INTO name2_users
      FROM public.user_swipes
      WHERE name = other_name_record.name AND action = 'like';
      
      -- Calculate Jaccard similarity
      IF (name1_users + name2_users - co_occurrence) > 0 THEN
        jaccard_similarity := co_occurrence::DECIMAL / (name1_users + name2_users - co_occurrence);
      ELSE
        jaccard_similarity := 0;
      END IF;
      
      -- Only store if there's some co-occurrence
      IF co_occurrence > 0 THEN
        INSERT INTO public.name_similarities (
          name1, name2, similarity_score, co_occurrence_count
        ) VALUES (
          name_record.name, other_name_record.name, jaccard_similarity, co_occurrence
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;