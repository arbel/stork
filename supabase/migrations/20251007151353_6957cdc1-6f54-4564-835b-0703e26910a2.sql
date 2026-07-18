-- Add male and female occurrence columns to names table
ALTER TABLE public.names 
ADD COLUMN IF NOT EXISTS male_occurrences integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS female_occurrences integer DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_names_occurrences ON public.names(male_occurrences, female_occurrences);

-- Add comment for documentation
COMMENT ON COLUMN public.names.male_occurrences IS 'Number of male occurrences of this name';
COMMENT ON COLUMN public.names.female_occurrences IS 'Number of female occurrences of this name';