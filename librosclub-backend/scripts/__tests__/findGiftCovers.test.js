const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  run, readApiKey, buildSearchUrl, pickCandidates, redact,
} = require('../find-gift-covers');

const BACKEND_DIR = path.join(__dirname, '..', '..');
const API_KEY = 'test-secret-key';
const CANDIDATE_FIELDS = ['coverUrl', 'googleAuthors', 'googleTitle', 'infoLink', 'language', 'publishedDate', 'volumeId'];

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
});

function book(id, title, author, coverUrl = null) {
  return { id, title, author, coverUrl, coverColor: '#5E5827', active: true };
}

function fixture(books) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-covers-'));
  tempDirs.push(dir);
  const seedPath = path.join(dir, 'gift_books.json');
  fs.writeFileSync(seedPath, `${JSON.stringify(books, null, 2)}\n`);
  return { seedPath, outDir: path.join(dir, 'out') };
}

function volume(id, { language = 'es', thumbnail, title = `Título ${id}`, authors = ['Autora'] } = {}) {
  return {
    id,
    volumeInfo: {
      title,
      authors,
      language,
      publishedDate: '2020',
      imageLinks: { thumbnail: thumbnail ?? `http://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api` },
      infoLink: `http://books.google.com/books?id=${id}`,
    },
  };
}

function jsonResponse(body, status = 200) {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
}

function textResponse(text, status) {
  return { status, ok: status >= 200 && status < 300, text: async () => text };
}

function scriptedFetch(responders) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: new URL(url), options });
    const responder = responders.shift();
    if (!responder) throw new Error('fetch inesperado');
    return responder(url, options);
  };
  return { fetchImpl, calls };
}

function recorder() {
  const out = { log: [], error: [], sleeps: [] };
  return {
    out,
    log: (message) => out.log.push(message),
    error: (message) => out.error.push(message),
    sleep: async (ms) => { out.sleeps.push(ms); },
  };
}

async function runWith({ books, responders, env = { GOOGLE_BOOKS_API_KEY: API_KEY }, ...rest }) {
  const files = fixture(books);
  const fetch = scriptedFetch(responders);
  const rec = recorder();
  const code = await run({
    env,
    fetchImpl: fetch.fetchImpl,
    sleep: rec.sleep,
    log: rec.log,
    error: rec.error,
    ...files,
    ...rest,
  });
  const jsonPath = path.join(files.outDir, 'gift-cover-candidates.json');
  const htmlPath = path.join(files.outDir, 'gift-cover-candidates.html');
  return {
    code,
    calls: fetch.calls,
    ...rec.out,
    ...files,
    entries: fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : null,
    jsonText: fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, 'utf8') : '',
    html: fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '',
  };
}

const ok = (items) => () => jsonResponse(items === undefined ? {} : { items });
const status = (code, body = '') => () => textResponse(body, code);

describe('find-gift-covers: alcance', () => {
  it('expone el script en package.json y no se monta en el servidor', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['covers:gift:find'], 'node scripts/find-gift-covers.js');
    const sources = [path.join(BACKEND_DIR, 'src', 'app.js')];
    const routesDir = path.join(BACKEND_DIR, 'src', 'routes');
    for (const name of fs.readdirSync(routesDir)) sources.push(path.join(routesDir, name));
    for (const file of sources) {
      if (fs.statSync(file).isFile()) {
        assert.equal(fs.readFileSync(file, 'utf8').includes('find-gift-covers'), false, file);
      }
    }
  });

  it('busca solo los libros sin portada', async () => {
    const result = await runWith({
      books: [
        book(1, 'Uno', 'A'),
        book(2, 'Dos', 'B', 'https://books.google.com/books/content?id=x'),
        book(3, 'Tres', 'C'),
      ],
      responders: [ok([volume('v1')]), ok([volume('v3')])],
    });
    assert.deepEqual(result.calls.map((call) => call.url.searchParams.get('q')), [
      'intitle:"Uno" inauthor:"A"',
      'intitle:"Tres" inauthor:"C"',
    ]);
    assert.deepEqual(result.entries.map((entry) => entry.id), [1, 3]);
    assert.equal(result.code, 0);
  });

  it('no modifica gift_books.json ni carga la base', async () => {
    const files = fixture([book(1, 'Uno', 'A')]);
    const before = crypto.createHash('sha256').update(fs.readFileSync(files.seedPath)).digest('hex');
    const rec = recorder();
    await run({
      env: { GOOGLE_BOOKS_API_KEY: API_KEY },
      fetchImpl: async () => jsonResponse({ items: [volume('v1')] }),
      sleep: rec.sleep,
      log: rec.log,
      error: rec.error,
      ...files,
    });
    const after = crypto.createHash('sha256').update(fs.readFileSync(files.seedPath)).digest('hex');
    assert.equal(after, before);
    assert.equal(require.cache[require.resolve('../../src/config/db')], undefined);
  });

  it('scripts/out está ignorado por git', (t) => {
    const root = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: BACKEND_DIR, encoding: 'utf8' });
    if (root.error || root.status !== 0) {
      t.skip('git no está disponible o no es un repositorio');
      return;
    }
    const result = spawnSync(
      'git',
      ['check-ignore', 'librosclub-backend/scripts/out/gift-cover-candidates.json'],
      { cwd: root.stdout.trim(), encoding: 'utf8' },
    );
    assert.equal(result.status, 0);
  });

  it('tiene la entrada scripts/out/ en el .gitignore del backend', () => {
    const lines = fs.readFileSync(path.join(BACKEND_DIR, '.gitignore'), 'utf8').split('\n');
    assert.ok(lines.includes('scripts/out/'));
  });
});

describe('find-gift-covers: consulta', () => {
  it('arma la primera consulta con título, autor e idioma', async () => {
    const result = await runWith({
      books: [book(1, 'Caballo de fuego', 'Florencia Bonelli')],
      responders: [ok([volume('v1')])],
    });
    const [{ url }] = result.calls;
    assert.equal(url.protocol, 'https:');
    assert.equal(url.host, 'www.googleapis.com');
    assert.equal(url.pathname, '/books/v1/volumes');
    assert.equal(url.searchParams.get('q'), 'intitle:"Caballo de fuego" inauthor:"Florencia Bonelli"');
    assert.equal(url.searchParams.get('langRestrict'), 'es');
    assert.equal(url.searchParams.get('maxResults'), '10');
    assert.equal(url.searchParams.get('printType'), 'books');
    assert.equal(url.searchParams.get('key'), API_KEY);
    assert.equal(
      url.searchParams.get('fields'),
      'items(id,volumeInfo(title,authors,language,publishedDate,imageLinks/thumbnail,infoLink))',
    );
  });

  it('quita comillas del título y autor', () => {
    const url = new URL(buildSearchUrl({ title: 'El "gran" libro', author: 'A "B"', apiKey: 'k', langRestrict: null }));
    assert.equal(url.searchParams.get('q'), 'intitle:"El gran libro" inauthor:"A B"');
    assert.equal(url.searchParams.has('langRestrict'), false);
  });

  it('repite sin idioma solo si la primera no trae resultados con imagen', async () => {
    const noImage = { id: 'sin', volumeInfo: { title: 'x', imageLinks: { thumbnail: '' } } };
    const twice = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [ok([noImage]), ok([volume('v1')])],
    });
    assert.equal(twice.calls.length, 2);
    assert.equal(twice.calls[0].url.searchParams.get('langRestrict'), 'es');
    assert.equal(twice.calls[1].url.searchParams.has('langRestrict'), false);
    const first = new URLSearchParams(twice.calls[0].url.search);
    first.delete('langRestrict');
    assert.equal(first.toString(), twice.calls[1].url.searchParams.toString());
    assert.equal(twice.entries[0].status, 'found');

    const once = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [ok([volume('v1', { thumbnail: 'https://example.com/x.jpg' })])],
    });
    assert.equal(once.calls.length, 1);
    assert.equal(once.entries[0].status, 'not_found');
  });
});

describe('find-gift-covers: candidatos', () => {
  it('prioriza español, deduplica, descarta hosts no permitidos y corta en 3', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [ok([
        volume('en1', { language: 'en' }),
        volume('es1'),
        volume('en2', { language: 'en' }),
        volume('es1'),
        volume('mal', { thumbnail: 'https://example.com/tapa.jpg' }),
        volume('es2'),
        volume('es3'),
      ])],
    });
    const [entry] = result.entries;
    assert.deepEqual(entry.candidates.map((c) => c.volumeId), ['es1', 'es2', 'es3']);
    assert.ok(entry.candidates.every((c) => c.language === 'es'));
  });

  it('mantiene el orden de Google para el resto de los idiomas', () => {
    const candidates = pickCandidates([
      volume('en1', { language: 'en' }),
      volume('es1'),
      volume('fr1', { language: 'fr' }),
    ]);
    assert.deepEqual(candidates.map((c) => c.volumeId), ['es1', 'en1', 'fr1']);
  });

  it('normaliza la portada a https sin edge=curl', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [ok([volume('abc')])],
    });
    const [candidate] = result.entries[0].candidates;
    assert.equal(
      candidate.coverUrl,
      'https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    );
    assert.equal(candidate.infoLink, 'https://books.google.com/books?id=abc');
  });

  it('tolera campos faltantes o de tipo inesperado', () => {
    const candidates = pickCandidates([
      null,
      { volumeInfo: { imageLinks: { thumbnail: 'https://books.google.com/x?id=1' } } },
      { id: 'a', volumeInfo: { title: 7, authors: ['X', 3], language: 5, imageLinks: { thumbnail: 'https://books.google.com/x?id=a' }, infoLink: 'javascript:x' } },
    ]);
    assert.deepEqual(candidates, [{
      volumeId: 'a',
      googleTitle: '',
      googleAuthors: ['X'],
      language: null,
      publishedDate: null,
      coverUrl: 'https://books.google.com/x?id=a',
      infoLink: null,
    }]);
    assert.deepEqual(pickCandidates('no'), []);
  });

  it('escribe found, not_found y error con la forma esperada', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A'), book(2, 'Dos', 'B'), book(3, 'Tres', 'C')],
      responders: [
        ok([volume('v1'), volume('v2', { language: 'en' })]),
        ok([]),
        ok([]),
        status(500),
        status(500),
      ],
    });
    assert.equal(result.code, 2);
    assert.deepEqual(result.entries.map((e) => e.status), ['found', 'not_found', 'error']);
    assert.ok(result.entries.every((e) => e.approvedVolumeId === null));
    assert.equal(result.entries[2].httpStatus, 500);
    assert.deepEqual(result.entries[0], {
      id: 1,
      title: 'Uno',
      author: 'A',
      status: 'found',
      candidates: result.entries[0].candidates,
      approvedVolumeId: null,
    });
    for (const candidate of result.entries[0].candidates) {
      assert.deepEqual(Object.keys(candidate).sort(), CANDIDATE_FIELDS);
    }
    assert.equal(result.sleeps.filter((ms) => ms === 2000).length, 1);
    assert.equal(result.jsonText, `${JSON.stringify(result.entries, null, 2)}\n`);
  });

  it('escribe la página de revisión con una sección por libro', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A'), book(2, 'Dos', 'B')],
      responders: [ok([volume('v1')]), ok([volume('v2')])],
    });
    assert.equal(result.html.split('<section').length - 1, 2);
    assert.ok(result.html.includes('<img src="https://books.google.com/books/content?id=v1'));
  });
});

describe('find-gift-covers: secretos y errores', () => {
  it('nunca escribe la key en logs, JSON ni HTML', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A'), book(2, 'Dos', 'B'), book(3, 'Tres', 'C')],
      responders: [
        ok([volume('v1')]),
        status(500, `boom ${API_KEY}`),
        (url) => { throw new Error(`request to ${url} failed`); },
        status(403, `{"error":"key ${API_KEY} inválida"}`),
      ],
    });
    assert.equal(result.code, 1);
    const captured = [...result.log, ...result.error].join('\n');
    assert.equal(captured.includes(API_KEY), false);
    assert.equal(captured.includes('googleapis'), false);
    assert.equal(result.jsonText.includes(API_KEY), false);
    assert.equal(result.html.includes(API_KEY), false);
    assert.deepEqual(result.entries.map((e) => [e.id, e.status, e.httpStatus]), [
      [1, 'found', undefined],
      [2, 'error', null],
    ]);
    assert.ok(result.error.some((line) => line.includes('403')));
  });

  it('redact reemplaza la key literal y no toca nada con una key vacía', () => {
    assert.equal(redact('a k.e+y b k.e+y', 'k.e+y'), 'a [redactado] b [redactado]');
    assert.equal(redact('texto', ''), 'texto');
  });

  for (const [name, env] of [
    ['ausente', {}],
    ['vacía', { GOOGLE_BOOKS_API_KEY: '   ' }],
    ['solo comillas', { GOOGLE_BOOKS_API_KEY: '""' }],
  ]) {
    it(`corta sin requests ni archivos con la key ${name}`, async () => {
      const result = await runWith({ books: [book(1, 'Uno', 'A')], responders: [], env });
      assert.equal(result.code, 1);
      assert.deepEqual(result.error, ['GOOGLE_BOOKS_API_KEY no está configurada en .env']);
      assert.equal(result.calls.length, 0);
      assert.equal(fs.existsSync(result.outDir), false);
    });
  }

  it('readApiKey quita espacios y comillas envolventes', () => {
    assert.equal(readApiKey({ GOOGLE_BOOKS_API_KEY: ' "abc" ' }), 'abc');
    assert.equal(readApiKey({ GOOGLE_BOOKS_API_KEY: "'abc'" }), 'abc');
    assert.equal(readApiKey({}), '');
    assert.equal(readApiKey(undefined), '');
  });

  it('corta sin requests si gift_books.json es ilegible', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-covers-'));
    tempDirs.push(dir);
    const seedPath = path.join(dir, 'gift_books.json');
    fs.writeFileSync(seedPath, '{ roto');
    const rec = recorder();
    let calls = 0;
    const code = await run({
      env: { GOOGLE_BOOKS_API_KEY: API_KEY },
      fetchImpl: async () => { calls += 1; return jsonResponse({}); },
      sleep: rec.sleep,
      log: rec.log,
      error: rec.error,
      seedPath,
      outDir: path.join(dir, 'out'),
    });
    assert.equal(code, 1);
    assert.equal(calls, 0);
    assert.equal(rec.out.error.length, 1);
    assert.equal(fs.existsSync(path.join(dir, 'out')), false);
  });

  it('respeta el presupuesto de requests y espera 250 ms entre requests', async () => {
    const books = [book(1, 'Uno', 'A'), book(2, 'Dos', 'B'), book(3, 'Tres', 'C')];
    const failing = Array.from({ length: 20 }, () => status(500));
    const result = await runWith({ books, responders: failing });
    assert.equal(result.calls.length, 2 * books.length);
    assert.equal(result.sleeps.filter((ms) => ms === 250).length, result.calls.length - 1);
    assert.ok(result.entries.every((e) => e.status === 'error' && e.httpStatus === 500));

    const exhausted = await runWith({
      books,
      responders: [ok([]), status(500), status(500), status(500), status(500), status(500), status(500)],
    });
    assert.equal(exhausted.calls.length, 6);
    assert.deepEqual(exhausted.entries.map((e) => [e.status, e.httpStatus]), [
      ['error', 500],
      ['error', 500],
      ['error', null],
    ]);
    assert.equal(exhausted.code, 2);
  });

  it('trata un 200 no-JSON como error sin reintento', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [() => textResponse('<html>', 200)],
    });
    assert.equal(result.calls.length, 1);
    assert.deepEqual([result.entries[0].status, result.entries[0].httpStatus], ['error', 200]);
  });

  it('trata items ausente como not_found', async () => {
    const result = await runWith({ books: [book(1, 'Uno', 'A')], responders: [ok(undefined), ok(undefined)] });
    assert.equal(result.entries[0].status, 'not_found');
    assert.equal(result.code, 0);
  });

  it('recupera un error de red en el reintento', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [() => { throw new Error('ECONNRESET'); }, ok([volume('v1')])],
    });
    assert.equal(result.entries[0].status, 'found');
    assert.deepEqual(result.sleeps, [2000, 250]);
  });

  for (const code of [401, 404]) {
    it(`corta la corrida ante un ${code} sin reintento`, async () => {
      const result = await runWith({
        books: [book(1, 'Uno', 'A'), book(2, 'Dos', 'B'), book(3, 'Tres', 'C')],
        responders: [ok([volume('v1')]), status(code, API_KEY)],
      });
      assert.equal(result.code, 1);
      assert.equal(result.calls.length, 2);
      assert.deepEqual(result.error, [`Google Books respondió ${code}: se corta la corrida`]);
      assert.deepEqual(result.entries.map((e) => e.id), [1]);
      assert.equal([...result.log, ...result.error].join('\n').includes(API_KEY), false);
    });
  }

  it('trata un 302 como error sin reintento y sigue', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A'), book(2, 'Dos', 'B')],
      responders: [status(302), ok([volume('v2')])],
    });
    assert.equal(result.calls.length, 2);
    assert.deepEqual(result.entries.map((e) => [e.status, e.httpStatus]), [['error', 302], ['found', undefined]]);
    assert.equal(result.code, 2);
  });

  function hangingUntilAbort() {
    return (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const err = new Error(`aborted ${url}`);
        err.name = 'AbortError';
        reject(err);
      });
    });
  }

  it('aplica un timeout por request con un reintento', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [hangingUntilAbort(), hangingUntilAbort()],
      timeoutMs: 5,
    });
    assert.equal(result.calls.length, 2);
    assert.ok(result.calls.every((call) => call.options && call.options.signal));
    assert.deepEqual([result.entries[0].status, result.entries[0].httpStatus], ['error', null]);
    const lines = result.log.concat(result.error);
    assert.ok(lines.some((line) => line.includes('timeout')));
    assert.equal(lines.join('\n').includes('googleapis'), false);
  });

  it('recupera un timeout si el reintento responde', async () => {
    const result = await runWith({
      books: [book(1, 'Uno', 'A')],
      responders: [hangingUntilAbort(), ok([volume('v1')])],
      timeoutMs: 5,
    });
    assert.equal(result.entries[0].status, 'found');
    assert.equal(result.code, 0);
  });
});
