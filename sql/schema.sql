CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  passwort_hash TEXT NOT NULL,
  alter INTEGER NOT NULL,
  department TEXT NOT NULL,
  jahre_auf_xjam INTEGER NOT NULL,
  bild_vor_name TEXT NOT NULL,
  bild_nach_department TEXT NOT NULL,
  bild_nach_jahre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS swipes (
  id SERIAL PRIMARY KEY,
  swiper_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entscheidung TEXT NOT NULL CHECK (entscheidung IN ('like', 'dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, swiped_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
