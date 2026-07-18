-- Add unique constraint for name, gender, language, region combination
-- This ensures upsert operations work correctly and prevents duplicate names
ALTER TABLE public.names 
ADD CONSTRAINT names_unique_combination 
UNIQUE (name, gender, language, region);