
-- Add dismissal_type column to batting_inputs
ALTER TABLE public.batting_inputs
ADD COLUMN dismissal_type text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.batting_inputs.dismissal_type IS 'Type of dismissal: caught, bowled, run_out, stumped, lbw, hit_wicket, retired, etc. NULL if not out.';
