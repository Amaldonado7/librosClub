const { validateAnswers, candidateAges, recommend, buildBuyUrl } = require('../services/giftRecommender');
const { findActiveForAges, findActiveCoverUrl } = require('../repositories/giftBooksRepository');
const { fetchCoverImage } = require('../services/giftCoverFetcher');
const { isAllowedCoverUrl } = require('../utils/giftCoverUrl');

const NOT_ENOUGH_BOOKS = 'No hay suficientes libros para recomendar en este momento.';
const INVALID_REQUEST = 'Solicitud inválida.';
const COVER_NOT_AVAILABLE = 'Portada no disponible.';
const COVER_UPSTREAM_FAILED = 'No pudimos obtener la portada.';
const COVER_ID_PATTERN = /^[1-9]\d{0,9}$/;
const MAX_COVER_ID = 2147483647;
const COVER_CACHE_CONTROL = 'public, max-age=86400';

function toResponseBook(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    genreLabel: book.genreLabel,
    coverUrl: book.coverUrl ?? null,
    coverColor: book.coverColor,
    why: book.why,
    dedication: book.dedication,
    shareQuote: book.shareQuote,
    buyUrl: buildBuyUrl(book.title, book.author),
  };
}

async function getRecommendations(req, res) {
  const validation = validateAnswers(req.body);
  if (!validation.ok) {
    return res.status(400).json({ message: validation.message });
  }
  const { answers } = validation;
  const rows = await findActiveForAges(candidateAges(answers.age));
  const books = recommend(rows, answers);
  if (!books) {
    return res.status(503).json({ message: NOT_ENOUGH_BOOKS });
  }
  return res.status(200).json({
    profile: { relationship: answers.relationship, occasion: answers.occasion },
    books: books.map(toResponseBook),
  });
}

function parseCoverId(raw) {
  if (typeof raw !== 'string' || !COVER_ID_PATTERN.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_COVER_ID ? id : null;
}

async function getCover(req, res) {
  const id = parseCoverId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: INVALID_REQUEST });
  }
  const coverUrl = await findActiveCoverUrl(id);
  if (coverUrl === null || !isAllowedCoverUrl(coverUrl)) {
    return res.status(404).json({ message: COVER_NOT_AVAILABLE });
  }
  const startedAt = Date.now();
  const cover = await fetchCoverImage(coverUrl);
  if (!cover.ok) {
    console.warn(`gift-cover id=${id} status=502 ms=${Date.now() - startedAt}`);
    return res.status(502).json({ message: COVER_UPSTREAM_FAILED });
  }
  res.status(200);
  res.set({
    'Content-Type': cover.contentType,
    'Content-Length': String(cover.body.length),
    'Cache-Control': COVER_CACHE_CONTROL,
  });
  return res.end(cover.body);
}

module.exports = { getRecommendations, getCover };
