const { getGoogleFeed, searchVolumes } = require('../services/googleBooksService');
const cache = require('../utils/cache');

const TTL = Number(process.env.GOOGLE_BOOKS_CACHE_TTL_MS || 600000);

exports.getGoogleFeed = async (req, res) => {
  try {
    const topic = String(req.query.topic ?? 'fiction');
    const limit = Math.min(40, Math.max(1, Number(req.query.limit ?? 10)));
    const lang = String(req.query.lang ?? 'es');
    const page = Math.max(0, Number(req.query.page ?? 0));

    const key = `gfeed:${topic}:${limit}:${lang}:${page}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const payload = await getGoogleFeed({ topic, limit, lang, page });
    cache.set(key, payload, TTL);

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error getGoogleFeed:', error);
    return res.status(500).json({ message: 'Error al obtener feed de Google Books' });
  }
};

exports.searchGoogleBooks = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ message: 'q es requerido' });

    const page = Math.max(0, Number(req.query.page || 0));
    const pageSize = Math.min(40, Math.max(1, Number(req.query.pageSize || 20)));
    const lang = String(req.query.lang || 'es');

    const key = `gsearch:${q}:${page}:${pageSize}:${lang}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const payload = await searchVolumes({ q, page, pageSize, lang });
    cache.set(key, payload, TTL);

    return res.json(payload);
  } catch (e) {
    console.error('Error searchGoogleBooks:', e);
    return res.status(e.status || 500).json({ message: 'Error al buscar en Google Books' });
  }
};
