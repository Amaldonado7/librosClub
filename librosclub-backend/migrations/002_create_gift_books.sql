CREATE TABLE IF NOT EXISTS public.gift_books (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  author         TEXT NOT NULL,
  cover_url      TEXT NULL,
  cover_color    TEXT NOT NULL,
  genre_label    TEXT NOT NULL,
  why            TEXT NOT NULL,
  dedication     TEXT NOT NULL,
  share_quote    TEXT NOT NULL,
  age_ranges     TEXT[] NOT NULL,
  reading_levels TEXT[] NOT NULL,
  hooks          TEXT[] NOT NULL,
  kinds          TEXT[] NOT NULL,
  length         TEXT NOT NULL,
  tones          TEXT[] NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gift_books_title_chk CHECK (btrim(title) <> ''),
  CONSTRAINT gift_books_author_chk CHECK (btrim(author) <> ''),
  CONSTRAINT gift_books_cover_url_chk CHECK (cover_url IS NULL OR cover_url ~ '^https://'),
  CONSTRAINT gift_books_cover_color_chk CHECK (cover_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT gift_books_genre_label_chk CHECK (btrim(genre_label) <> ''),
  CONSTRAINT gift_books_why_chk CHECK (btrim(why) <> ''),
  CONSTRAINT gift_books_dedication_chk CHECK (btrim(dedication) <> ''),
  CONSTRAINT gift_books_share_quote_chk CHECK (char_length(share_quote) <= 120 AND btrim(share_quote) <> ''),
  CONSTRAINT gift_books_age_ranges_chk CHECK (
    cardinality(age_ranges) >= 1
    AND age_ranges <@ ARRAY['joven', 'adulto']::text[]
  ),
  CONSTRAINT gift_books_reading_levels_chk CHECK (
    cardinality(reading_levels) >= 1
    AND reading_levels <@ ARRAY['casi_nunca', 'vacaciones', 'mensual', 'devora']::text[]
  ),
  CONSTRAINT gift_books_hooks_chk CHECK (
    cardinality(hooks) >= 1
    AND hooks <@ ARRAY['amor', 'misterio', 'humor', 'anime_manga']::text[]
  ),
  CONSTRAINT gift_books_kinds_chk CHECK (
    cardinality(kinds) >= 1
    AND kinds <@ ARRAY['novela', 'historia_real', 'aprender', 'poesia']::text[]
  ),
  CONSTRAINT gift_books_length_chk CHECK (length IN ('corto', 'mediano', 'largo')),
  CONSTRAINT gift_books_tones_chk CHECK (
    cardinality(tones) >= 1
    AND tones <@ ARRAY['liviano', 'emotivo', 'intenso']::text[]
  )
);
