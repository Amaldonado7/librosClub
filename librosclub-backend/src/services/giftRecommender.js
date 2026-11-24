const { ANSWER_FIELDS, ANSWER_VALUES, ADJACENT_AGE } = require('./giftValues');

const RESULT_SIZE = 3;
const BUY_URL_BASE = 'https://www.buscalibre.com.ar/libros/search?q=';

const LENGTH_POINTS = Object.freeze({
  corto: Object.freeze({ corto: 2, mediano: 1, largo: 0 }),
  mediano: Object.freeze({ mediano: 2, corto: 1, largo: 0 }),
  indistinto: Object.freeze({}),
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

function validateAnswers(body) {
  const source = isPlainObject(body) ? body : {};
  const answers = {};
  for (const field of ANSWER_FIELDS) {
    const value = hasOwn(source, field) ? source[field] : undefined;
    if (isMissing(value)) {
      return { ok: false, message: `Falta la respuesta: ${field}.` };
    }
    if (typeof value !== 'string' || !ANSWER_VALUES[field].includes(value)) {
      return { ok: false, message: `Respuesta inválida: ${field}.` };
    }
    answers[field] = value;
  }
  return { ok: true, answers };
}

function includes(list, value) {
  return Array.isArray(list) && list.includes(value);
}

function lengthPoints(answerLength, bookLength) {
  const table = LENGTH_POINTS[answerLength];
  return table && hasOwn(table, bookLength) ? table[bookLength] : 0;
}

function scoreBook(book, answers) {
  let score = 0;
  if (includes(book.hooks, answers.hook)) score += 3;
  if (includes(book.kinds, answers.kind)) score += 3;
  if (includes(book.tones, answers.tone)) score += 2;
  score += lengthPoints(answers.length, book.length);
  if (includes(book.readingLevels, answers.readingLevel)) score += 1;
  return score;
}

function buildBuyUrl(title, author) {
  return BUY_URL_BASE + encodeURIComponent(`${title} ${author}`);
}

function candidateAges(age) {
  return [age, ADJACENT_AGE[age]];
}

function rank(books, answers) {
  return books
    .map((book) => ({ book, score: scoreBook(book, answers) }))
    .sort((a, b) => b.score - a.score || a.book.id - b.book.id)
    .map(({ book }) => book);
}

function fillFrom(ranked, chosen) {
  const authors = new Set(chosen.map((book) => book.author));
  const skipped = [];
  for (const book of ranked) {
    if (chosen.length >= RESULT_SIZE) return;
    if (authors.has(book.author)) {
      skipped.push(book);
    } else {
      chosen.push(book);
      authors.add(book.author);
    }
  }
  for (const book of skipped) {
    if (chosen.length >= RESULT_SIZE) return;
    chosen.push(book);
  }
}

function selectThree(primary, adjacent) {
  const chosen = [];
  if (primary.length >= RESULT_SIZE) {
    fillFrom(primary, chosen);
  } else {
    chosen.push(...primary);
    fillFrom(adjacent, chosen);
  }
  return chosen.length === RESULT_SIZE ? chosen : null;
}

function recommend(books, answers) {
  const [age, adjacentAge] = candidateAges(answers.age);
  const active = books.filter((book) => book.active === true);
  const primary = active.filter((book) => includes(book.ageRanges, age));
  const adjacent = active.filter(
    (book) => includes(book.ageRanges, adjacentAge) && !includes(book.ageRanges, age),
  );
  return selectThree(rank(primary, answers), rank(adjacent, answers));
}

module.exports = { validateAnswers, scoreBook, candidateAges, recommend, buildBuyUrl };
