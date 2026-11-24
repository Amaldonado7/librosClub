const { validateAnswers, candidateAges, recommend, buildBuyUrl } = require('../services/giftRecommender');
const { findActiveForAges } = require('../repositories/giftBooksRepository');

const NOT_ENOUGH_BOOKS = 'No hay suficientes libros para recomendar en este momento.';

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

module.exports = { getRecommendations };
