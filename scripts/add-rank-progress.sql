-- Rank progress (additive; safe to re-run)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rank_points integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rank_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  award_key text NOT NULL,
  points integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rank_awards_user_key
  ON rank_awards (user_id, award_key);
