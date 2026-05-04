const fetch = require('node-fetch');

function getApiKey() {
  const raw = process.env.GOOGLE_BOOKS_API_KEY;
  if (!raw) {
    const err = new Error('GOOGLE_BOOKS_API_KEY no está configurada en .env');
    err.status = 500;
    throw err;
  }
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

function normalizePublishedDate(publishedDate) {
  if (!publishedDate) return null;

  const s = String(publishedDate).trim();
  // Google devuelve "YYYY" o "YYYY-MM" o "YYYY-MM-DD"
  const parts = s.split('-');

  if (parts.length === 1) return `${parts[0]}-01-01`;
  if (parts.length === 2) return `${parts[0]}-${parts[1]}-01`;
  return s; // YYYY-MM-DD
}

function comparePublishedDesc(a, b) {
  // nulls al final
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return b.localeCompare(a);
}

exports.getGoogleFeed = async ({ topic = 'fiction', limit = 10, lang = 'es', page = 0 }) => {
  const API_KEY = getApiKey();
  const safeLimit = Math.min(40, Math.max(1, Number(limit)));
  const safePage = Math.max(0, Number(page));
  const startIndex = safePage * safeLimit;

  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', `subject:${topic}`);
  url.searchParams.set('orderBy', 'newest');
  url.searchParams.set('maxResults', String(safeLimit));
  url.searchParams.set('startIndex', String(startIndex));
  url.searchParams.set('printType', 'books');
  url.searchParams.set('projection', 'lite');
  url.searchParams.set('langRestrict', String(lang));
  url.searchParams.set(
    'fields',
    'items(id,volumeInfo(title,authors,publishedDate,imageLinks,infoLink))'
  );
  url.searchParams.set('key', API_KEY);

  const r = await fetch(url.toString());
  const rawText = await r.text();

  if (!r.ok) {
    const err = new Error(`Google Books error ${r.status}: ${rawText}`);
    err.status = r.status;
    throw err;
  }

  const raw = JSON.parse(rawText);

  const items = (raw.items ?? [])
    .map((it) => {
      const vi = it.volumeInfo ?? {};
      const publishedDate = vi.publishedDate ?? null;
      const normalized = normalizePublishedDate(publishedDate);

      return {
        id: it.id,
        title: vi.title ?? '',
        authors: vi.authors ?? [],
        publishedDate,
        thumbnail: vi.imageLinks?.thumbnail ?? null,
        link: vi.infoLink ?? null,
        _publishedDateNormalized: normalized,
      };
    })
    .sort((a, b) =>
      comparePublishedDesc(
        a._publishedDateNormalized,
        b._publishedDateNormalized
      )
    )
    .map(({ _publishedDateNormalized, ...rest }) => rest);

  return {
    topic,
    limit: safeLimit,
    page: safePage,
    items,
  };
};

exports.searchVolumes = async ({ q, page = 0, pageSize = 20, lang = 'es' }) => {
  const API_KEY = getApiKey();
  const safePageSize = Math.min(40, Math.max(1, Number(pageSize)));
  const safePage = Math.max(0, Number(page));
  const startIndex = safePage * safePageSize;

  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', String(q));
  url.searchParams.set('maxResults', String(safePageSize));
  url.searchParams.set('startIndex', String(startIndex));
  url.searchParams.set('printType', 'books');
  url.searchParams.set('projection', 'lite');
  url.searchParams.set('langRestrict', String(lang));
  url.searchParams.set(
    'fields',
    'totalItems,items(id,volumeInfo(title,authors,publishedDate,imageLinks,infoLink))'
  );
  url.searchParams.set('key', API_KEY);

  const r = await fetch(url.toString());
  const rawText = await r.text();

  if (!r.ok) {
    const err = new Error(`Google Books error ${r.status}: ${rawText}`);
    err.status = r.status;
    throw err;
  }

  const raw = JSON.parse(rawText);

  const items = (raw.items ?? []).map((it) => {
    const vi = it.volumeInfo ?? {};
    return {
      id: it.id,
      title: vi.title ?? '',
      authors: vi.authors ?? [],
      publishedDate: vi.publishedDate ?? null,
      thumbnail: vi.imageLinks?.thumbnail ?? null,
      link: vi.infoLink ?? null,
    };
  });

  return {
    q,
    page: safePage,
    pageSize: safePageSize,
    totalItems: raw.totalItems ?? 0,
    items,
  };
};

