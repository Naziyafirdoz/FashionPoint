-- Color matcher history for logged-in users
CREATE TABLE IF NOT EXISTS color_match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  detected_colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS color_match_history_user_id_idx ON color_match_history(user_id);
CREATE INDEX IF NOT EXISTS color_match_history_created_at_idx ON color_match_history(created_at DESC);

ALTER TABLE color_match_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own color match history"
  ON color_match_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own color match history"
  ON color_match_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
