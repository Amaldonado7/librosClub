const ANSWER_FIELDS = Object.freeze([
  'relationship', 'occasion', 'age', 'readingLevel', 'hook', 'kind', 'length', 'tone',
]);

const ANSWER_VALUES = Object.freeze({
  relationship: Object.freeze(['mama', 'papa', 'pareja', 'amigo', 'hermano', 'hijo', 'otro']),
  occasion: Object.freeze(['cumpleanos', 'navidad', 'dia_madre_padre', 'aniversario', 'porque_si']),
  age: Object.freeze(['joven', 'adulto']),
  readingLevel: Object.freeze(['casi_nunca', 'vacaciones', 'mensual', 'devora']),
  hook: Object.freeze(['amor', 'misterio', 'humor', 'anime_manga']),
  kind: Object.freeze(['novela', 'historia_real', 'aprender', 'poesia']),
  length: Object.freeze(['corto', 'mediano', 'indistinto']),
  tone: Object.freeze(['liviano', 'emotivo', 'intenso']),
});

const BOOK_LENGTHS = Object.freeze(['corto', 'mediano', 'largo']);

const ADJACENT_AGE = Object.freeze({
  joven: 'adulto',
  adulto: 'joven',
});

module.exports = { ANSWER_FIELDS, ANSWER_VALUES, BOOK_LENGTHS, ADJACENT_AGE };
