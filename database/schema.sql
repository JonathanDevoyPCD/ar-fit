CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx
  ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  is_organizer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
  ON profiles (LOWER(username));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  username TEXT,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_challenges_email_idx
  ON otp_challenges (LOWER(email));

CREATE INDEX IF NOT EXISTS otp_challenges_created_idx
  ON otp_challenges (created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx
  ON sessions (user_id);

CREATE TABLE IF NOT EXISTS planner_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  type TEXT NOT NULL CHECK (type IN ('workout', 'meal')),
  time_label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS planner_items_user_week_idx
  ON planner_items (user_id, week_start);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS courses_status_idx
  ON courses (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS courses_owner_idx
  ON courses (owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS course_legs (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  leg_index INTEGER NOT NULL CHECK (leg_index >= 1),
  name TEXT NOT NULL,
  discipline TEXT NOT NULL CHECK (discipline IN ('bike', 'hike', 'kayak', 'run', 'trek', 'other')),
  notes TEXT NOT NULL DEFAULT '',
  target_minutes INTEGER CHECK (target_minutes IS NULL OR target_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, leg_index)
);

CREATE INDEX IF NOT EXISTS course_legs_course_idx
  ON course_legs (course_id, leg_index);

CREATE TABLE IF NOT EXISTS course_checkpoints (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  leg_id UUID NOT NULL REFERENCES course_legs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  radius_m INTEGER NOT NULL DEFAULT 25 CHECK (radius_m BETWEEN 5 AND 200),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, leg_id, sequence)
);

CREATE INDEX IF NOT EXISTS course_checkpoints_course_idx
  ON course_checkpoints (course_id, leg_id, sequence);

CREATE TABLE IF NOT EXISTS course_transitions (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  from_leg_id UUID NOT NULL REFERENCES course_legs(id) ON DELETE CASCADE,
  to_leg_id UUID NOT NULL REFERENCES course_legs(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL CHECK (discipline IN ('bike', 'hike', 'kayak', 'run', 'trek', 'other')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, from_leg_id, to_leg_id)
);

CREATE INDEX IF NOT EXISTS course_transitions_course_idx
  ON course_transitions (course_id);
