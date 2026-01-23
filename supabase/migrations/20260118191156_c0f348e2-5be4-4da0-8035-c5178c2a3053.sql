-- Create team_settings table for storing team configuration like logo
CREATE TABLE public.team_settings (
    id integer PRIMARY KEY DEFAULT 1,
    team_name text NOT NULL DEFAULT 'Stellar Slayers',
    team_logo_url text,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Enable Row Level Security
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read and admin write
CREATE POLICY "Public read access for team_settings" 
ON public.team_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admin full access for team_settings" 
ON public.team_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.team_settings (id, team_name, description) 
VALUES (1, 'Stellar Slayers', 'A passionate cricket team dedicated to excellence, sportsmanship, and the love of the game.')
ON CONFLICT (id) DO NOTHING;