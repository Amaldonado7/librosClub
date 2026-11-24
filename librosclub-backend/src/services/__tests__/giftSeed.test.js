const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { recommend } = require('../giftRecommender');
const { ANSWER_VALUES, BOOK_LENGTHS } = require('../giftValues');
const {
  buildSeedSql, isFrozen, readFrozen, OUTPUT_NAME, SEED_JSON, FROZEN_JSON, MIGRATIONS_DIR,
} = require('../../../scripts/build-gift-seed');

const seed = JSON.parse(fs.readFileSync(SEED_JSON, 'utf8'));
const active = seed.filter((book) => book.active === true);

const LATER_SEED_MIGRATION = /^0(0[4-9]|[1-9]\d)_.*gift_books.*\.sql$/;
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
      assert.ok(book.coverUrl === null || /^https:\/\//.test(book.coverUrl));
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
