const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateAnswers, scoreBook, candidateAges, recommend, buildBuyUrl,
} = require('../giftRecommender');
const { ANSWER_FIELDS, ANSWER_VALUES, ADJACENT_AGE } = require('../giftValues');

const VALID = Object.freeze({
  relationship: 'mama',
  occasion: 'navidad',
  age: 'adulto',
  readingLevel: 'vacaciones',
  hook: 'humor',
  kind: 'novela',
  length: 'corto',
  tone: 'liviano',
});

function answers(overrides = {}) {
  return { ...VALID, ...overrides };
}

function book(overrides = {}) {
  return {
    id: 1,
    title: 'Título',
    author: 'Autor',
    ageRanges: ['adulto'],
    readingLevels: ['casi_nunca'],
    hooks: ['misterio'],
    kinds: ['aprender'],
    length: 'largo',
    tones: ['intenso'],
    active: true,
    ...overrides,
  };
}

describe('validateAnswers', () => {
  it('acepta las 8 respuestas válidas y devuelve solo esos campos', () => {
    const result = validateAnswers({ ...VALID, extra: '<script>' });
    assert.deepEqual(result, { ok: true, answers: { ...VALID } });
  });

  for (const field of ANSWER_FIELDS) {
    it(`informa la falta de ${field}`, () => {
      const body = answers();
      delete body[field];
      assert.deepEqual(validateAnswers(body), { ok: false, message: `Falta la respuesta: ${field}.` });
    });
  }

  it('con dos faltantes nombra el primero según el orden', () => {
    const body = answers();
    delete body.tone;
    delete body.age;
    assert.equal(validateAnswers(body).message, 'Falta la respuesta: age.');
  });

  it('trata cadena vacía y null como faltantes', () => {
    assert.equal(validateAnswers(answers({ hook: '' })).message, 'Falta la respuesta: hook.');
    assert.equal(validateAnswers(answers({ kind: null })).message, 'Falta la respuesta: kind.');
  });

  it('rechaza un valor fuera de la lista', () => {
    assert.deepEqual(validateAnswers(answers({ tone: 'alegre' })), { ok: false, message: 'Respuesta inválida: tone.' });
  });

  for (const value of [5, ['humor'], {}, true]) {
    it(`rechaza un valor no string (${JSON.stringify(value)})`, () => {
      assert.equal(validateAnswers(answers({ hook: value })).message, 'Respuesta inválida: hook.');
    });
  }

  it('trata un cuerpo array, null o primitivo como vacío', () => {
    for (const body of [[], null, undefined, 'texto', 42]) {
      assert.equal(validateAnswers(body).message, 'Falta la respuesta: relationship.');
    }
  });

  it('no cuenta propiedades heredadas como presentes', () => {
    const inherited = Object.create({ relationship: 'mama' });
    assert.equal(validateAnswers(inherited).message, 'Falta la respuesta: relationship.');
    const body = answers();
    delete body.occasion;
    assert.equal(validateAnswers({ ...body, constructor: 'x' }).message, 'Falta la respuesta: occasion.');
  });

  for (const age of ['chico', 'adolescente', 'mayor']) {
    it(`rechaza la edad ${age}`, () => {
      assert.deepEqual(validateAnswers(answers({ age })), { ok: false, message: 'Respuesta inválida: age.' });
    });
  }

  it('acepta las edades joven y adulto', () => {
    assert.equal(validateAnswers(answers({ age: 'joven' })).ok, true);
    assert.equal(validateAnswers(answers({ age: 'adulto' })).ok, true);
  });

  it('no acepta nombres de propiedades del prototipo como valor', () => {
    assert.equal(validateAnswers(answers({ age: 'constructor' })).message, 'Respuesta inválida: age.');
  });
});

describe('scoreBook', () => {
  it('suma 11 en el caso máximo', () => {
    const b = book({ hooks: ['humor'], kinds: ['novela'], tones: ['liviano'], length: 'corto', readingLevels: ['vacaciones'] });
    assert.equal(scoreBook(b, answers()), 11);
  });

  it('suma cada criterio por separado', () => {
    const base = answers({ length: 'indistinto' });
    assert.equal(scoreBook(book(), base), 0);
    assert.equal(scoreBook(book({ hooks: ['humor'] }), base), 3);
    assert.equal(scoreBook(book({ kinds: ['novela'] }), base), 3);
    assert.equal(scoreBook(book({ tones: ['liviano'] }), base), 2);
    assert.equal(scoreBook(book({ readingLevels: ['vacaciones'] }), base), 1);
  });

  const LENGTH_TABLE = [
    ['corto', 'corto', 2], ['corto', 'mediano', 1], ['corto', 'largo', 0],
    ['mediano', 'mediano', 2], ['mediano', 'corto', 1], ['mediano', 'largo', 0],
    ['indistinto', 'corto', 0], ['indistinto', 'mediano', 0], ['indistinto', 'largo', 0],
  ];
  for (const [answer, bookLength, expected] of LENGTH_TABLE) {
    it(`largo: respuesta ${answer} y libro ${bookLength} suma ${expected}`, () => {
      assert.equal(scoreBook(book({ length: bookLength }), answers({ length: answer })), expected);
    });
  }

  it('tolera etiquetas que no son arrays', () => {
    assert.equal(scoreBook(book({ hooks: null, kinds: undefined, tones: 'liviano', readingLevels: {} }), answers({ length: 'indistinto' })), 0);
  });
});

describe('candidateAges', () => {
  const PAIRS = {
    joven: ['joven', 'adulto'],
    adulto: ['adulto', 'joven'],
  };
  for (const [age, expected] of Object.entries(PAIRS)) {
    it(`${age} → ${expected.join(', ')}`, () => {
      assert.deepEqual(candidateAges(age), expected);
    });
  }

  it('devuelve un array nuevo en cada llamada', () => {
    const first = candidateAges('joven');
    first.push('otro');
    first[0] = 'adulto';
    assert.deepEqual(candidateAges('joven'), ['joven', 'adulto']);
  });

  it('relaja entre las mismas dos edades que se aceptan como respuesta', () => {
    assert.deepEqual(Object.keys(ADJACENT_AGE).sort(), [...ANSWER_VALUES.age].sort());
    assert.deepEqual([...ANSWER_VALUES.age].sort(), ['adulto', 'joven']);
    for (const age of ANSWER_VALUES.age) {
      assert.equal(ADJACENT_AGE[ADJACENT_AGE[age]], age);
    }
  });
});

describe('buildBuyUrl', () => {
  it('arma la búsqueda de Buscalibre Argentina', () => {
    assert.equal(
      buildBuyUrl('Antes de que se enfríe el café', 'Toshikazu Kawaguchi'),
      'https://www.buscalibre.com.ar/libros/search?q=Antes%20de%20que%20se%20enfr%C3%ADe%20el%20caf%C3%A9%20Toshikazu%20Kawaguchi',
    );
  });

  it('codifica caracteres reservados', () => {
    const url = buildBuyUrl('A & B #1?', 'X');
    assert.ok(url.includes('%26'));
    assert.ok(url.includes('%23'));
    assert.ok(url.includes('%3F'));
    assert.equal(url.includes('&'), false);
  });
});

describe('recommend', () => {
  const ids = (result) => result.map((b) => b.id);

  it('solo devuelve libros del rango elegido en todas las combinaciones', () => {
    const catalog = [];
    let id = 1;
    for (const age of ANSWER_VALUES.age) {
      for (const hook of ANSWER_VALUES.hook) {
        catalog.push(book({
          id, author: `Autor ${id}`, ageRanges: [age], hooks: [hook],
          kinds: [ANSWER_VALUES.kind[id % 4]], tones: [ANSWER_VALUES.tone[id % 3]],
          length: ['corto', 'mediano', 'largo'][id % 3], readingLevels: [ANSWER_VALUES.readingLevel[id % 4]],
        }));
        id += 1;
      }
    }
    let combinations = 0;
    for (const age of ANSWER_VALUES.age) {
      for (const readingLevel of ANSWER_VALUES.readingLevel) {
        for (const hook of ANSWER_VALUES.hook) {
          for (const kind of ANSWER_VALUES.kind) {
            for (const length of ANSWER_VALUES.length) {
              for (const tone of ANSWER_VALUES.tone) {
                const result = recommend(catalog, answers({ age, readingLevel, hook, kind, length, tone }));
                assert.equal(result.length, 3);
                assert.ok(result.every((b) => b.ageRanges.includes(age)));
                combinations += 1;
              }
            }
          }
        }
      }
    }
    assert.equal(combinations, 1152);
  });

  it('excluye libros inactivos aunque tengan el puntaje máximo', () => {
    const catalog = [
      book({ id: 1, author: 'A', hooks: ['humor'], kinds: ['novela'], tones: ['liviano'], length: 'corto', readingLevels: ['vacaciones'], active: false }),
      book({ id: 2, author: 'B' }),
      book({ id: 3, author: 'C' }),
      book({ id: 4, author: 'D' }),
    ];
    assert.deepEqual(ids(recommend(catalog, answers())), [2, 3, 4]);
  });

  it('ordena por puntaje descendente y desempata por id ascendente', () => {
    const catalog = [
      book({ id: 9, author: 'A' }),
      book({ id: 7, author: 'B', hooks: ['humor'] }),
      book({ id: 5, author: 'C' }),
      book({ id: 3, author: 'D' }),
      book({ id: 8, author: 'E', hooks: ['humor'], kinds: ['novela'] }),
    ];
    assert.deepEqual(ids(recommend(catalog, answers())), [8, 7, 3]);
  });

  it('es determinístico y no muta la entrada', () => {
    const catalog = [book({ id: 3, author: 'A' }), book({ id: 1, author: 'B' }), book({ id: 2, author: 'C' }), book({ id: 4, author: 'D' })];
    const snapshot = structuredClone(catalog);
    const input = answers();
    const first = recommend(catalog, input);
    const second = recommend(catalog, input);
    assert.deepEqual(first, second);
    assert.deepEqual(catalog, snapshot);
    assert.deepEqual(input, answers());
  });

  for (const [age, other] of [['joven', 'adulto'], ['adulto', 'joven']]) {
    it(`completa ${age} con ${other} sin desplazar a los del rango elegido`, () => {
      const catalog = [
        book({ id: 1, author: 'A', ageRanges: [age] }),
        book({ id: 2, author: 'B', ageRanges: [age] }),
        ...[3, 4, 5, 6, 7].map((id) => book({ id, author: `Otro ${id}`, ageRanges: [other], hooks: ['humor'], kinds: ['novela'] })),
      ];
      const result = recommend(catalog, answers({ age }));
      assert.deepEqual(ids(result), [1, 2, 3]);
      assert.ok(result.slice(0, 2).every((b) => b.ageRanges.includes(age)));
      assert.deepEqual(result[2].ageRanges, [other]);
    });
  }

  it('solo completa con el otro rango', () => {
    const catalog = [
      book({ id: 1, author: 'A', ageRanges: ['joven'] }),
      book({ id: 2, author: 'B', ageRanges: ['adulto'] }),
      book({ id: 3, author: 'C', ageRanges: ['mayor'] }),
      book({ id: 4, author: 'D', ageRanges: ['mayor'] }),
    ];
    assert.equal(recommend(catalog, answers({ age: 'joven' })), null);
  });

  it('devuelve null si hay menos de 3 libros activos', () => {
    const catalog = [book({ id: 1, author: 'A' }), book({ id: 2, author: 'B', ageRanges: ['joven'] })];
    assert.equal(recommend(catalog, answers()), null);
    assert.equal(recommend([], answers()), null);
  });

  it('evita dos libros del mismo autor mientras haya otro candidato', () => {
    const catalog = [
      book({ id: 1, author: 'Repetido', hooks: ['humor'], kinds: ['novela'] }),
      book({ id: 2, author: 'Repetido', hooks: ['humor'], kinds: ['novela'] }),
      book({ id: 3, author: 'Otro', hooks: ['humor'] }),
      book({ id: 4, author: 'Tercero' }),
    ];
    assert.deepEqual(ids(recommend(catalog, answers())), [1, 3, 4]);
  });

  it('repite autor cuando no hay otro candidato', () => {
    const catalog = [1, 2, 3].map((id) => book({ id, author: 'Única' }));
    assert.deepEqual(ids(recommend(catalog, answers())), [1, 2, 3]);
  });

  it('prefiere un libro del rango elegido aunque repita autor antes que uno adyacente', () => {
    const catalog = [
      book({ id: 1, author: 'Misma', ageRanges: ['joven'] }),
      book({ id: 2, author: 'Misma', ageRanges: ['joven'] }),
      book({ id: 3, author: 'Otra', ageRanges: ['adulto'], hooks: ['humor'] }),
      book({ id: 4, author: 'Misma', ageRanges: ['adulto'], hooks: ['humor'], kinds: ['novela'] }),
    ];
    assert.deepEqual(ids(recommend(catalog, answers({ age: 'joven' }))), [1, 2, 3]);
  });

  it('cuenta como del rango elegido a un libro que está en ambos rangos', () => {
    const catalog = [
      book({ id: 1, author: 'A', ageRanges: ['joven'] }),
      book({ id: 2, author: 'B', ageRanges: ['joven', 'adulto'] }),
      book({ id: 3, author: 'C', ageRanges: ['adulto'], hooks: ['humor'], kinds: ['novela'] }),
      book({ id: 4, author: 'D', ageRanges: ['joven'] }),
    ];
    assert.deepEqual(ids(recommend(catalog, answers({ age: 'joven' }))), [1, 2, 4]);
  });

  it('ignora relationship y occasion para elegir', () => {
    const catalog = [1, 2, 3, 4, 5].map((id) => book({ id, author: `A${id}`, hooks: id % 2 ? ['humor'] : ['amor'] }));
    const a = recommend(catalog, answers({ relationship: 'mama', occasion: 'navidad' }));
    const b = recommend(catalog, answers({ relationship: 'amigo', occasion: 'porque_si' }));
    assert.deepEqual(a, b);
  });

  it('ignora libros con ageRanges inválido', () => {
    const catalog = [
      book({ id: 1, author: 'A', ageRanges: [] }),
      book({ id: 2, author: 'B', ageRanges: null }),
      book({ id: 3, author: 'C', ageRanges: ['otro'] }),
      book({ id: 4, author: 'D' }),
    ];
    assert.equal(recommend(catalog, answers()), null);
  });
});
