const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { recommend } = require('../giftRecommender');
const { ANSWER_VALUES, BOOK_LENGTHS } = require('../giftValues');
const {
  buildSeedSql, buildCoversSql, build, isFrozen, readFrozen,
  OUTPUT_NAME, COVERS_OUTPUT_NAME, SEED_JSON, FROZEN_JSON, MIGRATIONS_DIR,
} = require('../../../scripts/build-gift-seed');
const { isAllowedCoverUrl } = require('../../../scripts/lib/giftCoverUrl');

const seed = JSON.parse(fs.readFileSync(SEED_JSON, 'utf8'));
const active = seed.filter((book) => book.active === true);

const LATER_SEED_MIGRATION = /^0(0[4-9]|[1-9]\d)_.*gift_books.*\.sql$/;
const LATER_COVERS_MIGRATION = /^0(0[5-9]|[1-9]\d)_.*gift_books.*\.sql$/;
const COVERS_DRIFT_MESSAGE = 'el catálogo cambió portadas pero 004 está congelada: agregá una migración 005+';
const COVER_UPDATE_LINE = /^UPDATE public\.gift_books SET cover_url = '((?:[^']|'')*)', updated_at = now\(\) WHERE id = (\d+);$/gm;
const ARRAY_FIELDS = {
  ageRanges: ANSWER_VALUES.age,
  readingLevels: ANSWER_VALUES.readingLevel,
  hooks: ANSWER_VALUES.hook,
  kinds: ANSWER_VALUES.kind,
  tones: ANSWER_VALUES.tone,
};
const TEXT_FIELDS = ['title', 'author', 'genreLabel', 'why', 'dedication', 'shareQuote'];
const ROMANCE_AUTHORS = [
  'Florencia Bonelli', 'Colleen Hoover', 'Emily Henry', 'Alice Kellen', 'Elísabet Benavent',
  'Mercedes Ron', 'Joana Marcús', 'Jojo Moyes', 'Ali Hazelwood', 'Sarah J. Maas',
];
const BESTSELLER_AUTHORS = ['Rebecca Yarros', 'Julia Quinn', 'Megan Maxwell', 'Nicholas Sparks'];

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function frozenViolations(migrationsDir, frozen, generated003) {
  const violations = [];
  for (const [fileName, expected] of Object.entries(frozen)) {
    const filePath = path.join(migrationsDir, fileName);
    if (!fs.existsSync(filePath)) {
      violations.push(`${fileName} figura congelada pero no existe`);
      continue;
    }
    const content = fs.readFileSync(filePath);
    if (sha256(content) !== expected) {
      violations.push(`${fileName} fue modificada después de congelarse`);
    }
  }
  const frozen003 = path.join(migrationsDir, OUTPUT_NAME);
  if (Object.prototype.hasOwnProperty.call(frozen, OUTPUT_NAME) && fs.existsSync(frozen003)) {
    const changed = fs.readFileSync(frozen003, 'utf8') !== generated003;
    const hasLater = fs.readdirSync(migrationsDir).some((name) => LATER_SEED_MIGRATION.test(name));
    if (changed && !hasLater) {
      violations.push('el catálogo cambió pero 003 está congelada: agregá una migración 004+');
    }
  }
  return violations;
}

function parseCoverUpdates(sql) {
  return [...sql.matchAll(COVER_UPDATE_LINE)]
    .map(([, url, id]) => [Number(id), url.replace(/''/g, "'")])
    .sort(([a], [b]) => a - b);
}

function coverPairs(books) {
  return books
    .filter((book) => book.coverUrl !== null)
    .map((book) => [book.id, book.coverUrl])
    .sort(([a], [b]) => a - b);
}

function coverDriftViolations(migrationsDir, frozen, books) {
  if (!Object.prototype.hasOwnProperty.call(frozen, COVERS_OUTPUT_NAME)) return [];
  if (fs.readdirSync(migrationsDir).some((name) => LATER_COVERS_MIGRATION.test(name))) return [];
  const filePath = path.join(migrationsDir, COVERS_OUTPUT_NAME);
  if (!fs.existsSync(filePath)) return [];
  const applied = parseCoverUpdates(fs.readFileSync(filePath, 'utf8'));
  const changed = JSON.stringify(applied) !== JSON.stringify(coverPairs(books));
  return changed ? [COVERS_DRIFT_MESSAGE] : [];
}

function withTempMigrations(files, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-seed-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content);
    }
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('semilla gift_books: integridad', () => {
  it('tiene al menos 60 libros con ids enteros únicos', () => {
    assert.ok(seed.length >= 60, `hay ${seed.length} libros`);
    const ids = seed.map((book) => book.id);
    assert.ok(ids.every((id) => Number.isInteger(id) && id > 0));
    assert.equal(new Set(ids).size, ids.length);
  });

  it('no repite título y autor', () => {
    const keys = seed.map((book) => `${book.title.toLowerCase()}|${book.author.toLowerCase()}`);
    assert.equal(new Set(keys).size, keys.length);
  });

  for (const book of seed) {
    it(`libro ${book.id} (${book.title}) respeta las restricciones de la tabla`, () => {
      for (const field of TEXT_FIELDS) {
        assert.equal(typeof book[field], 'string', `${field} no es texto`);
        assert.notEqual(book[field].trim(), '', `${field} vacío`);
      }
      assert.ok(book.shareQuote.length <= 120, `shareQuote tiene ${book.shareQuote.length} caracteres`);
      assert.match(book.coverColor, /^#[0-9A-Fa-f]{6}$/);
      assert.ok(book.coverUrl === null || isAllowedCoverUrl(book.coverUrl), `coverUrl ${book.coverUrl}`);
      assert.ok(BOOK_LENGTHS.includes(book.length), `length ${book.length}`);
      assert.equal(typeof book.active, 'boolean');
      for (const [field, allowed] of Object.entries(ARRAY_FIELDS)) {
        assert.ok(Array.isArray(book[field]) && book[field].length >= 1, `${field} vacío`);
        for (const value of book[field]) {
          assert.ok(allowed.includes(value), `${field} contiene ${value}`);
        }
      }
    });
  }
});

describe('semilla gift_books: cobertura', () => {
  it('tiene al menos 60 activos', () => {
    assert.ok(active.length >= 60);
  });

  for (const age of ANSWER_VALUES.age) {
    it(`cubre el rango ${age}`, () => {
      const inRange = active.filter((book) => book.ageRanges.includes(age));
      assert.ok(inRange.length >= 20, `${age}: ${inRange.length} libros`);
      assert.ok(new Set(inRange.map((book) => book.author)).size >= 3, `${age}: menos de 3 autores`);
      for (const hook of ANSWER_VALUES.hook) {
        assert.ok(inRange.some((book) => book.hooks.includes(hook)), `${age}: falta hook ${hook}`);
      }
      for (const kind of ANSWER_VALUES.kind) {
        assert.ok(inRange.some((book) => book.kinds.includes(kind)), `${age}: falta kind ${kind}`);
      }
    });
  }

  for (const [name, authors] of [['romance', ROMANCE_AUTHORS], ['más vendidos', BESTSELLER_AUTHORS]]) {
    it(`incluye al menos un libro activo de cada autor obligatorio (${name})`, () => {
      for (const author of authors) {
        assert.ok(active.some((book) => book.author === author), `falta un libro de ${author}`);
      }
    });
  }

  it('tiene al menos 15 libros activos con amor', () => {
    const romance = active.filter((book) => book.hooks.includes('amor')).length;
    assert.ok(romance >= 15, `hay ${romance} libros con amor`);
  });

  it('devuelve 3 libros distintos del rango en las 1152 combinaciones', () => {
    let combinations = 0;
    for (const age of ANSWER_VALUES.age) {
      for (const readingLevel of ANSWER_VALUES.readingLevel) {
        for (const hook of ANSWER_VALUES.hook) {
          for (const kind of ANSWER_VALUES.kind) {
            for (const length of ANSWER_VALUES.length) {
              for (const tone of ANSWER_VALUES.tone) {
                const answers = {
                  relationship: 'mama', occasion: 'navidad', age, readingLevel, hook, kind, length, tone,
                };
                const result = recommend(seed, answers);
                assert.ok(Array.isArray(result), `sin resultado para ${JSON.stringify(answers)}`);
                assert.equal(result.length, 3);
                assert.equal(new Set(result.map((book) => book.id)).size, 3);
                assert.ok(result.every((book) => book.ageRanges.includes(age)));
                combinations += 1;
              }
            }
          }
        }
      }
    }
    assert.equal(combinations, 1152);
  });
});

describe('migración 003 generada', () => {
  it('coincide con lo que genera el script mientras no está congelada', (t) => {
    if (isFrozen(OUTPUT_NAME)) {
      t.skip('003 está congelada: la verifica el test de congelamiento');
      return;
    }
    const filePath = path.join(MIGRATIONS_DIR, OUTPUT_NAME);
    assert.ok(fs.existsSync(filePath), `falta ${OUTPUT_NAME}: corré npm run seed:gift:build`);
    assert.equal(
      fs.readFileSync(filePath, 'utf8'),
      buildSeedSql(seed),
      `${OUTPUT_NAME} está desactualizada: corré npm run seed:gift:build`,
    );
  });

  it('respeta las migraciones congeladas del repositorio', () => {
    assert.deepEqual(frozenViolations(MIGRATIONS_DIR, readFrozen(FROZEN_JSON), buildSeedSql(seed)), []);
  });

  it('escapa comillas simples y arma arrays, nulos y booleanos', () => {
    const sql = buildSeedSql([{
      id: 2, title: "L'amour", author: "O'Neil", coverUrl: null, coverColor: '#5E5827', genreLabel: 'G',
      why: 'w', dedication: 'd', shareQuote: 'q', ageRanges: ['joven', 'adulto'], readingLevels: ['mensual'],
      hooks: ['amor'], kinds: ['novela'], length: 'corto', tones: ['liviano'], active: true,
    }, {
      id: 1, title: 'Primero', author: 'A', coverUrl: 'https://x.test/c.jpg', coverColor: '#000000', genreLabel: 'G',
      why: 'w', dedication: 'd', shareQuote: 'q', ageRanges: ['adulto'], readingLevels: ['devora'],
      hooks: ['humor'], kinds: ['poesia'], length: 'largo', tones: ['intenso'], active: false,
    }]);
    assert.ok(sql.includes("'L''amour'"));
    assert.ok(sql.includes("'O''Neil'"));
    assert.ok(sql.includes("ARRAY['joven', 'adulto']::text[]"));
    assert.ok(sql.includes('NULL'));
    assert.ok(sql.includes("'https://x.test/c.jpg'"));
    assert.ok(sql.includes(', false) ON CONFLICT (id) DO NOTHING;'));
    assert.ok(sql.indexOf("VALUES (1, 'Primero'") < sql.indexOf("VALUES (2, 'L''amour'"));
    assert.ok(sql.startsWith('BEGIN;\n'));
    assert.ok(sql.endsWith("SELECT setval(pg_get_serial_sequence('public.gift_books', 'id'), (SELECT MAX(id) FROM public.gift_books));\nCOMMIT;\n"));
    assert.equal(buildSeedSql(seed), buildSeedSql(seed));
  });

  it('detecta un frozen.json con 003 congelada', () => {
    withTempMigrations({ 'frozen.json': JSON.stringify({ [OUTPUT_NAME]: 'abc' }) }, (dir) => {
      assert.equal(isFrozen(OUTPUT_NAME, path.join(dir, 'frozen.json')), true);
      assert.equal(isFrozen('otra.sql', path.join(dir, 'frozen.json')), false);
      assert.equal(isFrozen(OUTPUT_NAME, path.join(dir, 'no-existe.json')), false);
    });
  });

  it('falla si una migración congelada fue editada', () => {
    const original = 'BEGIN;\nCOMMIT;\n';
    const edited = 'BEGIN;\nUPDATE x;\nCOMMIT;\n';
    withTempMigrations({ [OUTPUT_NAME]: edited }, (dir) => {
      const violations = frozenViolations(dir, { [OUTPUT_NAME]: sha256(original) }, edited);
      assert.deepEqual(violations, [`${OUTPUT_NAME} fue modificada después de congelarse`]);
    });
  });

  it('exige una migración 004+ si el catálogo cambió después de congelar 003', () => {
    const applied = 'BEGIN;\nCOMMIT;\n';
    const frozen = { [OUTPUT_NAME]: sha256(applied) };
    withTempMigrations({ [OUTPUT_NAME]: applied }, (dir) => {
      assert.deepEqual(frozenViolations(dir, frozen, 'BEGIN;\nnuevo\nCOMMIT;\n'), [
        'el catálogo cambió pero 003 está congelada: agregá una migración 004+',
      ]);
    });
    withTempMigrations({ [OUTPUT_NAME]: applied, '004_update_gift_books.sql': 'UPDATE;' }, (dir) => {
      assert.deepEqual(frozenViolations(dir, frozen, 'BEGIN;\nnuevo\nCOMMIT;\n'), []);
    });
    withTempMigrations({ [OUTPUT_NAME]: applied }, (dir) => {
      assert.deepEqual(frozenViolations(dir, frozen, applied), []);
    });
  });

  it('informa una migración congelada que no existe', () => {
    withTempMigrations({}, (dir) => {
      assert.deepEqual(frozenViolations(dir, { 'x.sql': 'abc' }, ''), ['x.sql figura congelada pero no existe']);
    });
  });
});

function captureLogs() {
  const lines = { log: [], error: [] };
  return {
    lines,
    log: (message) => lines.log.push(message),
    error: (message) => lines.error.push(message),
  };
}

function withBuildFixture({ books, frozen, files = {} }, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-build-'));
  try {
    const seedPath = path.join(dir, 'gift_books.json');
    const frozenPath = path.join(dir, 'frozen.json');
    fs.writeFileSync(seedPath, typeof books === 'string' ? books : JSON.stringify(books, null, 2));
    if (frozen) fs.writeFileSync(frozenPath, JSON.stringify(frozen, null, 2));
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content);
    }
    return run({ dir, seedPath, frozenPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const COVER_A = 'https://books.google.com/books/content?id=aaa&printsec=frontcover&img=1&zoom=1';
const COVER_B = 'https://books.googleusercontent.com/books/content?id=bbb&zoom=1';

describe('migración 004 de portadas', () => {
  const migration003Path = path.join(MIGRATIONS_DIR, OUTPUT_NAME);
  const migration004Path = path.join(MIGRATIONS_DIR, COVERS_OUTPUT_NAME);

  it('003 está congelada con el sha256 del archivo en disco', () => {
    assert.equal(readFrozen(FROZEN_JSON)[OUTPUT_NAME], sha256(fs.readFileSync(migration003Path)));
  });

  it('003 congelada solo difiere del catálogo en las portadas', () => {
    assert.equal(isFrozen(OUTPUT_NAME), true);
    assert.equal(
      fs.readFileSync(migration003Path, 'utf8'),
      buildSeedSql(seed.map((book) => ({ ...book, coverUrl: null }))),
    );
  });

  it('genera un UPDATE por libro con portada, ordenado por id y sin comentarios', () => {
    const sql = buildCoversSql([
      { id: 5, coverUrl: COVER_B },
      { id: 3, coverUrl: null },
      { id: 2, coverUrl: COVER_A },
    ]);
    assert.equal(sql, [
      'BEGIN;',
      `UPDATE public.gift_books SET cover_url = '${COVER_A}', updated_at = now() WHERE id = 2;`,
      `UPDATE public.gift_books SET cover_url = '${COVER_B}', updated_at = now() WHERE id = 5;`,
      'COMMIT;',
      '',
    ].join('\n'));
    assert.equal((sql.match(/^UPDATE /gm) || []).length, 2);
    assert.ok(sql.startsWith('BEGIN;\n'));
    assert.ok(sql.endsWith('COMMIT;\n'));
    assert.equal(sql.includes('--'), false);
    assert.equal(sql.includes('/*'), false);
    assert.equal(buildCoversSql([{ id: 1, coverUrl: null }]), 'BEGIN;\nCOMMIT;\n');
    assert.equal(buildCoversSql([]), 'BEGIN;\nCOMMIT;\n');
    const quoted = buildCoversSql([{ id: 7, coverUrl: "https://books.google.com/x?id=a'b" }]);
    assert.ok(quoted.includes("cover_url = 'https://books.google.com/x?id=a''b'"));
    assert.deepEqual(parseCoverUpdates(quoted), [[7, "https://books.google.com/x?id=a'b"]]);
  });

  it('rechaza portadas fuera de la regla informando el id', () => {
    for (const coverUrl of ['https://example.com/x.jpg', 'http://books.google.com/x']) {
      assert.throws(
        () => buildCoversSql([{ id: 2, coverUrl: COVER_A }, { id: 9, coverUrl }]),
        { message: 'coverUrl inválida en el libro 9' },
      );
    }
    assert.throws(() => buildCoversSql([{ id: 0, coverUrl: COVER_A }]), /libro 0/);
    assert.throws(() => buildCoversSql([{ id: '3', coverUrl: COVER_A }]), /libro 3/);
  });

  it('004 en disco coincide con el catálogo mientras no está congelada', (t) => {
    if (isFrozen(COVERS_OUTPUT_NAME)) {
      t.skip('004 está congelada: la verifica el test de deriva de portadas');
      return;
    }
    assert.ok(fs.existsSync(migration004Path), `falta ${COVERS_OUTPUT_NAME}: corré npm run seed:gift:build`);
    const onDisk = fs.readFileSync(migration004Path, 'utf8');
    assert.equal(onDisk, buildCoversSql(seed), `${COVERS_OUTPUT_NAME} está desactualizada: corré npm run seed:gift:build`);
    assert.deepEqual(parseCoverUpdates(onDisk), coverPairs(seed));
    assert.equal(buildCoversSql(seed), buildCoversSql(seed));
  });

  it('004 en disco no tiene comentarios', () => {
    const onDisk = fs.readFileSync(migration004Path, 'utf8');
    assert.equal(onDisk.includes('--'), false);
    assert.equal(onDisk.includes('/*'), false);
  });

  it('con 003 congelada no la reescribe, genera 004 y termina con 0', () => {
    const original003 = fs.readFileSync(migration003Path);
    const books = [{ ...seed[0], coverUrl: COVER_A }, { ...seed[1], coverUrl: null }];
    withBuildFixture({
      books,
      frozen: { [OUTPUT_NAME]: sha256(original003) },
      files: { [OUTPUT_NAME]: original003 },
    }, ({ dir, seedPath, frozenPath }) => {
      const logs = captureLogs();
      const code = build({ migrationsDir: dir, seedPath, frozenPath, log: logs.log, error: logs.error });
      assert.equal(code, 0);
      assert.equal(sha256(fs.readFileSync(path.join(dir, OUTPUT_NAME))), sha256(original003));
      const covers = fs.readFileSync(path.join(dir, COVERS_OUTPUT_NAME), 'utf8');
      assert.equal((covers.match(/^UPDATE /gm) || []).length, 1);
      assert.deepEqual(parseCoverUpdates(covers), [[seed[0].id, COVER_A]]);
      assert.ok(logs.lines.log.includes(`${OUTPUT_NAME} congelada: no se reescribe`));
      assert.deepEqual(logs.lines.error, []);
    });
  });

  it('sin salidas congeladas escribe 003 y 004', () => {
    const books = [{ ...seed[0], coverUrl: COVER_A }, { ...seed[1], coverUrl: null }];
    withBuildFixture({ books }, ({ dir, seedPath, frozenPath }) => {
      const logs = captureLogs();
      assert.equal(build({ migrationsDir: dir, seedPath, frozenPath, log: logs.log, error: logs.error }), 0);
      assert.equal(fs.readFileSync(path.join(dir, OUTPUT_NAME), 'utf8'), buildSeedSql(books));
      assert.equal(fs.readFileSync(path.join(dir, COVERS_OUTPUT_NAME), 'utf8'), buildCoversSql(books));
    });
  });

  it('con 004 congelada no la reescribe', () => {
    const books = [{ ...seed[0], coverUrl: COVER_A }];
    const applied = 'BEGIN;\nCOMMIT;\n';
    withBuildFixture({
      books,
      frozen: { [COVERS_OUTPUT_NAME]: sha256(applied) },
      files: { [COVERS_OUTPUT_NAME]: applied },
    }, ({ dir, seedPath, frozenPath }) => {
      const logs = captureLogs();
      assert.equal(build({ migrationsDir: dir, seedPath, frozenPath, log: logs.log, error: logs.error }), 0);
      assert.equal(fs.readFileSync(path.join(dir, COVERS_OUTPUT_NAME), 'utf8'), applied);
      assert.ok(logs.lines.log.includes(`${COVERS_OUTPUT_NAME} congelada: no se reescribe`));
    });
  });

  it('devuelve 1 sin crear 004 si una portada es inválida', () => {
    const books = [{ ...seed[0], coverUrl: 'https://example.com/x.jpg' }];
    withBuildFixture({ books }, ({ dir, seedPath, frozenPath }) => {
      const logs = captureLogs();
      assert.equal(build({ migrationsDir: dir, seedPath, frozenPath, log: logs.log, error: logs.error }), 1);
      assert.equal(fs.existsSync(path.join(dir, COVERS_OUTPUT_NAME)), false);
      assert.deepEqual(logs.lines.error, [`coverUrl inválida en el libro ${seed[0].id}`]);
    });
  });

  it('devuelve 1 sin escribir nada si el catálogo es ilegible', () => {
    withBuildFixture({ books: '{ no es json' }, ({ dir, seedPath, frozenPath }) => {
      const logs = captureLogs();
      assert.equal(build({ migrationsDir: dir, seedPath, frozenPath, log: logs.log, error: logs.error }), 1);
      assert.equal(fs.existsSync(path.join(dir, OUTPUT_NAME)), false);
      assert.equal(fs.existsSync(path.join(dir, COVERS_OUTPUT_NAME)), false);
      assert.equal(logs.lines.error.length, 1);
    });
  });

  it('detecta deriva de portadas con 004 congelada', () => {
    const applied = buildCoversSql([{ id: 2, coverUrl: COVER_A }]);
    const frozen = { [OUTPUT_NAME]: 'abc', [COVERS_OUTPUT_NAME]: sha256(applied) };
    const base = [{ id: 2, coverUrl: COVER_A }, { id: 5, coverUrl: null }];
    withTempMigrations({ [COVERS_OUTPUT_NAME]: applied }, (dir) => {
      assert.deepEqual(coverDriftViolations(dir, frozen, base), []);
      assert.deepEqual(
        coverDriftViolations(dir, frozen, [{ id: 2, coverUrl: COVER_B }, { id: 5, coverUrl: null }]),
        [COVERS_DRIFT_MESSAGE],
      );
      assert.deepEqual(
        coverDriftViolations(dir, frozen, [{ id: 2, coverUrl: COVER_A }, { id: 5, coverUrl: COVER_B }]),
        [COVERS_DRIFT_MESSAGE],
      );
      assert.deepEqual(coverDriftViolations(dir, { [OUTPUT_NAME]: 'abc' }, [{ id: 5, coverUrl: COVER_B }]), []);
    });
    withTempMigrations({
      [COVERS_OUTPUT_NAME]: applied,
      '005_update_gift_books_covers.sql': 'BEGIN;\nCOMMIT;\n',
    }, (dir) => {
      assert.deepEqual(coverDriftViolations(dir, frozen, [{ id: 2, coverUrl: COVER_B }]), []);
    });
  });

  it('no hay deriva de portadas en el repositorio', () => {
    assert.deepEqual(coverDriftViolations(MIGRATIONS_DIR, readFrozen(FROZEN_JSON), seed), []);
  });
});
