-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for player photos
CREATE POLICY "Anyone can view player photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

CREATE POLICY "Admins can upload player photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-photos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update player photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-photos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete player photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'player-photos' AND has_role(auth.uid(), 'admin'));

-- Add match result columns
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS opponent_name TEXT,
ADD COLUMN IF NOT EXISTS our_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS opponent_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('Won', 'Lost', 'Draw', 'Tied', 'No Result'));

-- Enable realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batting_inputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bowling_inputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fielding_inputs;