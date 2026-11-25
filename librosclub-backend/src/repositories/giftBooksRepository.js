const pool = require('../config/db');

const FIND_ACTIVE_FOR_AGES_SQL = `
  SELECT id, title, author, cover_url AS "coverUrl", cover_color AS "coverColor",
         genre_label AS "genreLabel", why, dedication, share_quote AS "shareQuote",
         age_ranges AS "ageRanges", reading_levels AS "readingLevels", hooks, kinds,
         length, tones, active
  FROM public.gift_books
  WHERE active = true AND age_ranges && $1::text[]
  ORDER BY id
`;

const FIND_ACTIVE_COVER_URL_SQL = 'SELECT cover_url AS "coverUrl" FROM public.gift_books WHERE id = $1 AND active = true';

async function findActiveForAges(ages) {
  const { rows } = await pool.query(FIND_ACTIVE_FOR_AGES_SQL, [ages]);
  return rows;
}

async function findActiveCoverUrl(id) {
  const { rows } = await pool.query(FIND_ACTIVE_COVER_URL_SQL, [id]);
  if (rows.length === 0) return null;
  return rows[0].coverUrl ?? null;
}

module.exports = { findActiveForAges, findActiveCoverUrl };
