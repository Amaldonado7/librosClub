const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { run, applyApprovals, validateCandidatesFile } = require('../apply-gift-covers');

const BACKEND_DIR = path.join(__dirname, '..', '..');
const COVER_ABC = 'https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1';
const COVER_OLD = 'https://books.googleusercontent.com/books/content?id=old&zoom=1';

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
});

function book(id, coverUrl = null) {
  return {
    id, title: `Libro ${id}`, author: `Autora ${id}`, coverUrl, coverColor: '#5E5827', active: true,
  };
}

function candidate(volumeId, coverUrl) {
  return {
    volumeId,
    googleTitle: 'T',
    googleAuthors: ['A'],
    language: 'es',
    publishedDate: '2020',
    coverUrl,
    infoLink: null,
  };
}

function entry(id, approvedVolumeId, candidates = [candidate('abc', COVER_ABC)]) {
  return {
    id, title: `Libro ${id}`, author: `Autora ${id}`, status: 'found', candidates, approvedVolumeId,
  };
}

function fixture(books, candidatesContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-covers-'));
  tempDirs.push(dir);
  const seedPath = path.join(dir, 'gift_books.json');
  const candidatesPath = path.join(dir, 'gift-cover-candidates.json');
  fs.writeFileSync(seedPath, `${JSON.stringify(books, null, 2)}\n`);
  if (candidatesContent !== undefined) {
    fs.writeFileSync(
      candidatesPath,
      typeof candidatesContent === 'string' ? candidatesContent : JSON.stringify(candidatesContent, null, 2),
    );
  }
  return { seedPath, candidatesPath };
}

function runFixture(books, candidatesContent) {
  const files = fixture(books, candidatesContent);
  const out = { log: [], error: [] };
  const code = run({
    ...files,
    log: (message) => out.log.push(message),
    error: (message) => out.error.push(message),
  });
  const text = fs.readFileSync(files.seedPath, 'utf8');
  return {
    code, ...out, ...files, text, books: JSON.parse(text), messages: [...out.log, ...out.error].join('\n'),
  };
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

describe('apply-gift-covers', () => {
  it('aplica la portada aprobada y deja null lo no aprobado', () => {
    const books = [book(1), book(2), book(3)];
    const result = runFixture(books, [entry(1, 'abc'), entry(2, null)]);
    assert.equal(result.code, 0);
    assert.equal(result.books[0].coverUrl, COVER_ABC);
    assert.equal(result.books[1].coverUrl, null);
    assert.deepEqual(result.books[2], books[2]);
    assert.deepEqual(result.books[0], { ...books[0], coverUrl: COVER_ABC });
    assert.deepEqual(Object.keys(result.books[0]), Object.keys(books[0]));
    assert.equal(result.text, `${JSON.stringify(result.books, null, 2)}\n`);
    assert.ok(result.log.some((line) => line.includes('aplicadas 1')));
  });

  it('avisa sin fallar cuando el volumeId aprobado no está entre los candidatos', () => {
    const result = runFixture([book(1, COVER_OLD), book(2)], [entry(1, 'zzz')]);
    assert.equal(result.code, 0);
    assert.equal(result.books[0].coverUrl, null);
    assert.ok(result.messages.includes('1'));
    assert.ok(result.messages.includes('sin coincidencia'));
  });

  for (const badUrl of ['https://example.com/x.jpg', 'http://books.google.com/x']) {
    it(`rechaza la portada aprobada ${badUrl} y escribe el resto`, () => {
      const result = runFixture([book(1), book(2)], [
        entry(1, 'abc'),
        entry(2, 'bad', [candidate('bad', badUrl)]),
      ]);
      assert.notEqual(result.code, 0);
      assert.equal(result.books[0].coverUrl, COVER_ABC);
      assert.equal(result.books[1].coverUrl, null);
      assert.ok(result.error.some((line) => line.includes('2') && line.includes('rechazada')));
    });
  }

  for (const [name, content] of [
    ['ausente', undefined],
    ['con JSON inválido', '{ roto'],
    ['con raíz objeto', { entries: [] }],
    ['con candidates no-array', [{ id: 1, candidates: 'x', approvedVolumeId: null }]],
    ['con id no entero', [{ id: '1', candidates: [], approvedVolumeId: null }]],
    ['con approvedVolumeId numérico', [{ id: 1, candidates: [], approvedVolumeId: 3 }]],
  ]) {
    it(`no escribe nada con el archivo de candidatos ${name}`, () => {
      const books = [book(1)];
      const files = fixture(books, content);
      const before = sha256(fs.readFileSync(files.seedPath));
      const out = [];
      const code = run({ ...files, log: () => {}, error: (message) => out.push(message) });
      assert.equal(code, 1);
      assert.equal(sha256(fs.readFileSync(files.seedPath)), before);
      assert.equal(out.length, 1);
    });
  }

  it('devuelve 1 si gift_books.json es ilegible', () => {
    const files = fixture([book(1)], [entry(1, 'abc')]);
    fs.writeFileSync(files.seedPath, '{ roto');
    const out = [];
    assert.equal(run({ ...files, log: () => {}, error: (message) => out.push(message) }), 1);
    assert.equal(fs.readFileSync(files.seedPath, 'utf8'), '{ roto');
    assert.equal(out.length, 1);
  });

  it('conserva la portada de libros fuera del archivo e ignora ids inexistentes', () => {
    const result = runFixture([book(1, COVER_OLD), book(2)], [entry(2, 'abc'), entry(99, 'abc')]);
    assert.equal(result.code, 0);
    assert.equal(result.books[0].coverUrl, COVER_OLD);
    assert.equal(result.books[1].coverUrl, COVER_ABC);
    assert.equal(result.books.length, 2);
    assert.ok(result.messages.includes('99'));
  });

  it('expone el script en package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['covers:gift:apply'], 'node scripts/apply-gift-covers.js');
  });
});

describe('apply-gift-covers: funciones puras', () => {
  it('applyApprovals clasifica cada entrada sin mutar el catálogo', () => {
    const books = [book(1), book(2), book(3), book(4)];
    const result = applyApprovals(books, [
      entry(1, 'abc'),
      entry(2, 'zzz'),
      entry(3, 'bad', [candidate('bad', 'https://example.com/x.jpg')]),
      entry(4, null),
      entry(50, 'abc'),
    ]);
    assert.deepEqual(result.applied, [1]);
    assert.deepEqual(result.mismatched, [2]);
    assert.deepEqual(result.rejected, [3]);
    assert.deepEqual(result.unapproved, [4]);
    assert.deepEqual(result.unknown, [50]);
    assert.deepEqual(result.books.map((b) => b.coverUrl), [COVER_ABC, null, null, null]);
    assert.ok(books.every((b) => b.coverUrl === null));
  });

  it('validateCandidatesFile acepta la forma esperada', () => {
    assert.equal(validateCandidatesFile([entry(1, null), entry(2, 'abc')]), null);
    assert.equal(validateCandidatesFile([]), null);
    assert.equal(typeof validateCandidatesFile({}), 'string');
    assert.equal(typeof validateCandidatesFile([null]), 'string');
  });
});
