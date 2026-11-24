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

async function findActiveForAges(ages) {
  const { rows } = await pool.query(FIND_ACTIVE_FOR_AGES_SQL, [ages]);
  return rows;
}

module.exports = { findActiveForAges };
