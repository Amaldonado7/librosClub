#!/usr/bin/env node
// Smoke de las 38 rutas del backend (FEAT-001 · RNF-10 · AC-37 · T-M-11).
// Las 2 rutas legadas de /api/users fueron eliminadas; el smoke verifica que respondan 404 sin crear filas.
// Script de verificación de la fase VERIFY. No es código de producción.
// Node 18+ (usa el fetch nativo), sin dependencias.
//
// Uso (desde la raíz del repo):
//   node docs/work/FEAT-001/smoke/smoke-routes.mjs
//   SMOKE_ADMIN_USERNAME=... SMOKE_ADMIN_PASSWORD=... node docs/work/FEAT-001/smoke/smoke-routes.mjs
//
// Guardas (fallan cerradas, antes de cualquier request):
//   - El host de SMOKE_BASE_URL (default http://localhost:3000/api) tiene que ser localhost, 127.0.0.1 o ::1.
//   - DB_HOST sale del entorno o, si no está, de librosclub-backend/.env (parseado a mano).
//     Tiene que ser localhost, 127.0.0.1 o ::1. Ese host validado es el único que usa psql.
// Datos: todo lo que se crea lleva el prefijo smoke_feat001_. Al final corre teardown.sql en una
// transacción y verifica que los conteos queden en 0. Nunca imprime tokens ni contraseñas.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const ENV_FILE = path.join(REPO_ROOT, 'librosclub-backend', '.env');
const TEARDOWN = path.join(HERE, 'teardown.sql');
const RESULTS_FILE = path.join(HERE, 'results.json');
const PREFIX = 'smoke_feat001_';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const MAX_LOGINS = 7;
const LEGACY = 'legacy';

function die(msg) {
  console.error(`ABORT: ${msg}`);
  process.exit(2);
}

// ---------- Guardas ----------
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000/api';
let baseUrl;
try { baseUrl = new URL(BASE); } catch { die(`SMOKE_BASE_URL inválida: ${BASE}`); }
if (!LOCAL_HOSTS.has(baseUrl.hostname)) die(`SMOKE_BASE_URL no es local (${baseUrl.hostname}).`);

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}
const fileEnv = parseEnvFile(ENV_FILE);
const pick = (k) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : fileEnv[k]);

const dbHostRaw = pick('DB_HOST');
if (!dbHostRaw) die('No se encontró DB_HOST (ni en el entorno ni en librosclub-backend/.env).');
if (!LOCAL_HOSTS.has(dbHostRaw)) die(`DB_HOST no es local (${dbHostRaw}).`);
const VALIDATED_DB_HOST = dbHostRaw;
if (pick('DATABASE_URL')) {
  // config/db.js prioriza DATABASE_URL sobre DB_HOST: si existe, el backend podría no estar en la base local.
  let h = '';
  try { h = new URL(pick('DATABASE_URL')).hostname; } catch { /* inválida */ }
  if (!LOCAL_HOSTS.has(h)) die('DATABASE_URL está definida y no apunta a un host local.');
}
const DB_PORT = pick('DB_PORT') || '5432';
const DB_USER = pick('DB_USER');
const DB_NAME = pick('DB_NAME');
if (!DB_USER || !DB_NAME) die('Faltan DB_USER/DB_NAME.');
const pgEnv = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || fileEnv.DB_PASSWORD || '' };

function psql(args, input) {
  const r = spawnSync('psql', ['-h', VALIDATED_DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME,
    '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', ...args], { env: pgEnv, input, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`psql falló (exit ${r.status}): ${r.stderr.trim()}`);
  return r.stdout.trim();
}

// ---------- HTTP ----------
let loginCount = 0;
const LIMITED = ['/auth/login', '/auth/register'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, p, { token, body } = {}) {
  const limited = LIMITED.includes(p);
  if (limited) {
    loginCount += 1;
    if (loginCount > MAX_LOGINS) throw new Error(`Presupuesto de logins excedido (${loginCount} > ${MAX_LOGINS}).`);
  }
  const doFetch = () => fetch(BASE.replace(/\/$/, '') + p, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let res = await doFetch();
  if (res.status === 429) {
    const reset = Math.min(900, Number(res.headers.get('ratelimit-reset') || 60));
    console.error(`429 en ${method} ${p}: espero ${reset}s y reintento una sola vez.`);
    await sleep((reset + 1) * 1000);
    res = await doFetch();
    if (res.status === 429) throw new Error(`429 persistente en ${method} ${p}: el loginLimiter sigue agotado.`);
  }
  let json = null;
  const text = await res.text();
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, json };
}

// ---------- Registro de resultados ----------
const rows = [];
const created = { user_ids: [], book_ids: [], club_ids: [], listing_ids: [] };

function record(route, method, p, role, expected, got, extraOk = true, note = '') {
  const exp = Array.isArray(expected) ? expected : [expected];
  const ok = exp.some((e) => (e === '2xx' ? got >= 200 && got < 300 : e === got)) && extraOk;
  rows.push({ route, method, path: p, role, expected: exp.join('|'), got, result: ok ? 'OK' : 'FAIL', note });
  return ok;
}
function pending(route, method, p, expected, note) {
  rows.push({ route, method, path: p, role: 'admin', expected, got: '-', result: 'PENDIENTE', note });
}

const ADMIN_USER = process.env.SMOKE_ADMIN_USERNAME;
const ADMIN_PASS = process.env.SMOKE_ADMIN_PASSWORD;
const HAS_ADMIN = Boolean(ADMIN_USER && ADMIN_PASS);
const PEND_ADMIN = 'pendiente: correr con credenciales admin de la usuaria';

async function main() {
  const ts = Date.now();
  const pass = `Sm0ke!${ts}`;
  const userA = `${PREFIX}${ts}_a@example.com`;
  const userB = `${PREFIX}${ts}_b@example.com`;

  // ===== auth (3) =====
  let r = await call('POST', '/auth/register', { body: { username: userA, password: pass, role: 'admin' } });
  record(2, 'POST', '/auth/register', 'anon', 201, r.status, Boolean(r.json?.token), 'crea usuario A (role:"admin" en body debe ignorarse)');
  r = await call('POST', '/auth/register', { body: { username: `${PREFIX}${ts}_short@example.com`, password: 'abc' } });
  record(2, 'POST', '/auth/register', 'anon', 400, r.status, true, 'contraseña de 3 caracteres');

  r = await call('POST', '/auth/login', { body: { username: userA, password: pass } });
  record(1, 'POST', '/auth/login', 'user', 200, r.status, Boolean(r.json?.token));
  const tokA = r.json?.token;
  if (!tokA) throw new Error('No se obtuvo token del usuario A; no se puede continuar.');
  const claimsA = JSON.parse(Buffer.from(tokA.split('.')[1], 'base64url').toString());
  created.user_ids.push(claimsA.userId);
  const roleOk = claimsA.role === 'user';
  record(2, 'POST', '/auth/register', 'anon', 'role=user', roleOk ? 'role=user' : `role=${claimsA.role}`, roleOk, 'RF-25: rol forzado a user');

  r = await call('POST', '/auth/login', { body: { username: userA, password: 'incorrecta' } });
  record(1, 'POST', '/auth/login', 'anon', 401, r.status, true, 'contraseña incorrecta');

  let tokAdmin = null;
  if (HAS_ADMIN) {
    r = await call('POST', '/auth/login', { body: { username: ADMIN_USER, password: ADMIN_PASS } });
    record(1, 'POST', '/auth/login', 'admin', 200, r.status, Boolean(r.json?.token));
    tokAdmin = r.json?.token || null;
  }

  r = await call('PUT', '/auth/upgrade');
  record(3, 'PUT', '/auth/upgrade', 'anon', 401, r.status);
  r = await call('PUT', '/auth/upgrade', { token: tokA });
  record(3, 'PUT', '/auth/upgrade', 'user', 200, r.status, Boolean(r.json?.token), 'solo modifica al usuario smoke A');

  // ===== usuario B por /auth/register (las rutas legadas /api/users fueron eliminadas) =====
  r = await call('POST', '/auth/register', { body: { username: userB, password: pass } });
  record(2, 'POST', '/auth/register', 'anon', 201, r.status, Boolean(r.json?.token), 'crea usuario B (segunda parte)');
  const tokB = r.json?.token || null;
  if (tokB) created.user_ids.push(JSON.parse(Buffer.from(tokB.split('.')[1], 'base64url').toString()).userId);

  // ===== regresión: rutas legadas eliminadas (no cuentan en las 38) =====
  const legacyUser = `${PREFIX}${ts}_legacy@example.com`;
  r = await call('POST', '/users/register', { body: { username: legacyUser, password: pass, role: 'admin' } });
  const legacyRows = Number(psql(['-v', `u=${legacyUser}`, '-f', '-'], "SELECT count(*) FROM public.users WHERE username = :'u';\n"));
  record(LEGACY, 'POST', '/users/register', 'anon (role:"admin")', 404, r.status, legacyRows === 0, `ruta eliminada; filas creadas=${legacyRows}`);
  r = await call('POST', '/users/login', { body: { username: userA, password: pass } });
  record(LEGACY, 'POST', '/users/login', 'anon', 404, r.status, true, 'ruta eliminada');

  // ===== regresión DAST-01: ids no numéricos no tumban el proceso (no cuentan en las 38) =====
  const health = async () => { try { return (await fetch(BASE.replace(/\/$/, '') + '/health')).status; } catch { return 0; } };
  for (const [m, p] of [['GET', '/clubs/abc'], ['DELETE', '/clubs/1/meetings/x'], ['DELETE', '/clubs/1/posts/1%20OR%201=1']]) {
    let st = 0;
    try { st = (await call(m, p, { token: tokA })).status; } catch { st = 0; }
    const h = await health();
    record(LEGACY, m, p, 'user', 400, st, h === 200, `DAST-01: /api/health después=${h}`);
    if (h !== 200) throw new Error(`El backend dejó de responder tras ${m} ${p} (DAST-01).`);
  }
  // ===== regresión DAST-02: errores en JSON sin stack =====
  {
    const res = await fetch(BASE.replace(/\/$/, '') + '/clubs', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokA}` }, body: '{"nombre": ' });
    const t = await res.text();
    record(LEGACY, 'POST', '/clubs (JSON malformado)', 'user', 400, res.status, (res.headers.get('content-type') || '').includes('application/json') && !/\bat \S+ \(|\/Users\/|node_modules/.test(t), 'DAST-02: JSON sin stack');
    const res2 = await fetch(BASE.replace(/\/$/, '') + '/health', { headers: { Origin: 'https://evil.example.com' } });
    const t2 = await res2.text();
    record(LEGACY, 'GET', '/health (Origin malicioso)', 'anon', 403, res2.status, (res2.headers.get('content-type') || '').includes('application/json') && !/\bat \S+ \(|\/Users\/|node_modules/.test(t2) && !res2.headers.get('access-control-allow-origin'), 'DAST-02: CORS 403 JSON sin stack');
  }

  // Segunda parte para las rutas que necesitan dos usuarios: el admin si hay credenciales; si no, el usuario B.
  const tokOther = HAS_ADMIN ? tokAdmin : tokB;
  const otherRole = HAS_ADMIN ? 'admin' : 'user';
  if (!tokOther) throw new Error('No hay token para la segunda parte; no se puede continuar.');

  // ===== protected (2) =====
  r = await call('GET', '/protected');
  record(17, 'GET', '/protected', 'anon', 401, r.status);
  r = await call('GET', '/protected', { token: tokA });
  record(17, 'GET', '/protected', 'user', 200, r.status);
  r = await call('GET', '/admin-only');
  record(18, 'GET', '/admin-only', 'anon', 401, r.status);
  r = await call('GET', '/admin-only', { token: tokA });
  record(18, 'GET', '/admin-only', 'user', 403, r.status);
  if (tokAdmin) { r = await call('GET', '/admin-only', { token: tokAdmin }); record(18, 'GET', '/admin-only', 'admin', 200, r.status); }
  else pending(18, 'GET', '/admin-only', '200', PEND_ADMIN);

  // ===== google-books (2) =====
  r = await call('GET', '/google-books/feed?topic=fiction&page=0');
  record(19, 'GET', '/google-books/feed?topic=fiction&page=0', 'anon', 200, r.status, (r.json?.items?.length ?? 0) >= 1, `items=${r.json?.items?.length ?? 0}`);
  r = await call('GET', '/google-books/search');
  record(20, 'GET', '/google-books/search', 'anon', 400, r.status, true, 'sin q');
  r = await call('GET', '/google-books/search?q=borges');
  record(20, 'GET', '/google-books/search?q=borges', 'anon', 200, r.status);

  // ===== books (11) =====
  r = await call('GET', '/books/feed');
  record(6, 'GET', '/books/feed', 'anon', 200, r.status);
  r = await call('GET', '/books');
  record(7, 'GET', '/books', 'anon', 200, r.status);
  r = await call('GET', '/books/requests');
  record(8, 'GET', '/books/requests', 'anon', 401, r.status);
  r = await call('GET', '/books/requests', { token: tokA });
  record(8, 'GET', '/books/requests', 'user', 403, r.status);
  if (tokAdmin) { r = await call('GET', '/books/requests', { token: tokAdmin }); record(8, 'GET', '/books/requests', 'admin', 200, r.status); }
  else pending(8, 'GET', '/books/requests', '200', PEND_ADMIN);
  r = await call('GET', '/books/my-requests');
  record(9, 'GET', '/books/my-requests', 'anon', 401, r.status);
  r = await call('GET', '/books/my-requests', { token: tokA });
  record(9, 'GET', '/books/my-requests', 'user', 200, r.status);

  const bookBody = { title: `${PREFIX}libro_${ts}`, author: 'smoke', type: 'venta' };
  r = await call('POST', '/books', { body: bookBody });
  record(10, 'POST', '/books', 'anon', 401, r.status);
  r = await call('POST', '/books', { token: tokA, body: bookBody });
  record(10, 'POST', '/books', 'user', 403, r.status);
  let bookId = null;
  if (tokAdmin) {
    r = await call('POST', '/books', { token: tokAdmin, body: bookBody });
    record(10, 'POST', '/books', 'admin', 201, r.status);
    bookId = r.json?.id ?? null;
  } else {
    pending(10, 'POST', '/books', '201', PEND_ADMIN);
    // Sin admin, el libro de prueba se crea como fixture SQL con el prefijo (lo borra teardown.sql).
    bookId = Number(psql(['-v', `title=${bookBody.title}`, '-f', '-'],
      "INSERT INTO public.books (title, author, type, is_available) VALUES (:'title', 'smoke', 'venta', true) RETURNING id;\n").split('\n').pop());
  }
  if (bookId) created.book_ids.push(bookId);

  r = await call('POST', `/books/${bookId}/request`);
  record(11, 'POST', '/books/:id/request', 'anon', 401, r.status);
  r = await call('POST', `/books/${bookId}/request`, { token: tokA });
  record(11, 'POST', '/books/:id/request', 'user', '2xx', r.status, true, 'sobre el libro smoke');
  const reqId = r.json?.id;

  r = await call('GET', `/books/requests/${reqId}/messages`);
  record(12, 'GET', '/books/requests/:reqId/messages', 'anon', 401, r.status);
  r = await call('GET', `/books/requests/${reqId}/messages`, { token: tokA });
  record(12, 'GET', '/books/requests/:reqId/messages', 'user', 200, r.status);

  r = await call('PUT', `/books/requests/${reqId}`, { body: { status: 'accepted' } });
  record(14, 'PUT', '/books/requests/:reqId', 'anon', 401, r.status);
  r = await call('PUT', `/books/requests/${reqId}`, { token: tokA, body: { status: 'accepted' } });
  record(14, 'PUT', '/books/requests/:reqId', 'user', 403, r.status);
  if (tokAdmin) {
    r = await call('PUT', `/books/requests/${reqId}`, { token: tokAdmin, body: { status: 'accepted' } });
    record(14, 'PUT', '/books/requests/:reqId', 'admin', 200, r.status);
  } else pending(14, 'PUT', '/books/requests/:reqId', '200', PEND_ADMIN);

  r = await call('POST', `/books/requests/${reqId}/messages`, { body: { message: `${PREFIX}msg` } });
  record(13, 'POST', '/books/requests/:reqId/messages', 'anon', 401, r.status);
  if (tokAdmin) {
    r = await call('POST', `/books/requests/${reqId}/messages`, { token: tokA, body: { message: `${PREFIX}msg` } });
    record(13, 'POST', '/books/requests/:reqId/messages', 'user', '2xx', r.status, true, 'solicitud aceptada por el admin');
  } else {
    r = await call('POST', `/books/requests/${reqId}/messages`, { token: tokA, body: { message: `${PREFIX}msg` } });
    record(13, 'POST', '/books/requests/:reqId/messages', 'user', 400, r.status, true,
      'solicitud pendiente: regla de negocio "chat solo para aceptadas" (el 2xx requiere aceptación admin)');
    pending(13, 'POST', '/books/requests/:reqId/messages', '2xx (tras aceptación admin)', PEND_ADMIN);
  }

  r = await call('PUT', `/books/${bookId}`, { body: { title: `${bookBody.title}_ed`, author: 'smoke' } });
  record(15, 'PUT', '/books/:id', 'anon', 401, r.status);
  r = await call('PUT', `/books/${bookId}`, { token: tokA, body: { title: `${bookBody.title}_ed`, author: 'smoke' } });
  record(15, 'PUT', '/books/:id', 'user', 403, r.status);
  if (tokAdmin) {
    r = await call('PUT', `/books/${bookId}`, { token: tokAdmin, body: { title: `${bookBody.title}_ed`, author: 'smoke' } });
    record(15, 'PUT', '/books/:id', 'admin', 200, r.status);
  } else pending(15, 'PUT', '/books/:id', '200', PEND_ADMIN);

  r = await call('DELETE', `/books/${bookId}`);
  record(16, 'DELETE', '/books/:id', 'anon', 401, r.status);
  r = await call('DELETE', `/books/${bookId}`, { token: tokA });
  record(16, 'DELETE', '/books/:id', 'user', 403, r.status);
  if (tokAdmin) {
    r = await call('DELETE', `/books/${bookId}`, { token: tokAdmin });
    record(16, 'DELETE', '/books/:id', 'admin', 200, r.status);
  } else pending(16, 'DELETE', '/books/:id', '200', PEND_ADMIN);

  // ===== exchanges (7) =====
  for (const [id, m, p] of [[21, 'GET', '/exchanges/admin'], [22, 'GET', '/exchanges/my'], [23, 'PUT', '/exchanges/requests/1'],
    [24, 'GET', '/exchanges'], [25, 'POST', '/exchanges'], [26, 'DELETE', '/exchanges/1'], [27, 'POST', '/exchanges/1/request']]) {
    r = await call(m, p, m === 'GET' || m === 'DELETE' ? {} : { body: {} });
    record(id, m, p.replace(/\/1(\/|$)/, '/:id$1'), 'anon', 401, r.status);
  }
  r = await call('GET', '/exchanges/admin', { token: tokA });
  record(21, 'GET', '/exchanges/admin', 'user', 403, r.status);
  if (tokAdmin) { r = await call('GET', '/exchanges/admin', { token: tokAdmin }); record(21, 'GET', '/exchanges/admin', 'admin', 200, r.status); }
  else pending(21, 'GET', '/exchanges/admin', '200', PEND_ADMIN);

  r = await call('POST', '/exchanges', { token: tokOther, body: { title: `${PREFIX}pub_${ts}`, author: 'smoke' } });
  record(25, 'POST', '/exchanges', otherRole, 201, r.status, true, `publicación smoke del ${otherRole === 'admin' ? 'admin' : 'usuario B'}`);
  const listingId = r.json?.id;
  if (listingId) created.listing_ids.push(listingId);
  r = await call('GET', '/exchanges', { token: tokA });
  record(24, 'GET', '/exchanges', 'user', 200, r.status, Array.isArray(r.json) && r.json.some((l) => l.id === listingId), 'incluye la publicación smoke');
  r = await call('POST', `/exchanges/${listingId}/request`, { token: tokA });
  record(27, 'POST', '/exchanges/:id/request', 'user', '2xx', r.status);
  const exReqId = r.json?.id;
  r = await call('GET', '/exchanges/my', { token: tokOther });
  record(22, 'GET', '/exchanges/my', otherRole, 200, r.status,
    Array.isArray(r.json) && r.json.some((l) => l.id === listingId && l.requests?.some((q) => q.id === exReqId)), 'incluye la solicitud entrante');
  r = await call('PUT', `/exchanges/requests/${exReqId}`, { token: tokA, body: { status: 'rejected' } });
  record(23, 'PUT', '/exchanges/requests/:requestId', 'user (no dueño)', 403, r.status);
  r = await call('PUT', `/exchanges/requests/${exReqId}`, { token: tokOther, body: { status: 'rejected' } });
  record(23, 'PUT', '/exchanges/requests/:requestId', `${otherRole} (dueño)`, 200, r.status);
  r = await call('DELETE', `/exchanges/${listingId}`, { token: tokA });
  record(26, 'DELETE', '/exchanges/:id', 'user (no dueño)', 404, r.status, true, 'el controller responde 404 "No encontrada o sin permiso"');
  r = await call('DELETE', `/exchanges/${listingId}`, { token: tokOther });
  record(26, 'DELETE', '/exchanges/:id', `${otherRole} (dueño)`, 200, r.status);

  // ===== clubs (13) =====
  r = await call('GET', '/clubs');
  record(28, 'GET', '/clubs', 'anon', 200, r.status);
  r = await call('GET', '/clubs/nearby?lat=-34.6&lng=-58.4&radius=5');
  record(29, 'GET', '/clubs/nearby?lat=-34.6&lng=-58.4&radius=5', 'anon', 200, r.status);
  r = await call('GET', '/clubs/nearby');
  record(29, 'GET', '/clubs/nearby', 'anon', 400, r.status, true, 'sin lat/lng');

  const clubPaths = [[30, 'POST', '/clubs', '/clubs'], [31, 'POST', '/clubs/1/join', '/clubs/:id/join'],
    [32, 'DELETE', '/clubs/1/leave', '/clubs/:id/leave'], [33, 'GET', '/clubs/1', '/clubs/:id'],
    [34, 'PUT', '/clubs/1/current-book', '/clubs/:id/current-book'], [35, 'PUT', '/clubs/1/location', '/clubs/:id/location'],
    [36, 'PUT', '/clubs/1/upgrade', '/clubs/:id/upgrade'], [37, 'POST', '/clubs/1/meetings', '/clubs/:id/meetings'],
    [38, 'DELETE', '/clubs/1/meetings/1', '/clubs/:id/meetings/:meetingId'], [39, 'POST', '/clubs/1/posts', '/clubs/:id/posts'],
    [40, 'DELETE', '/clubs/1/posts/1', '/clubs/:id/posts/:postId']];
  for (const [id, m, p, label] of clubPaths) {
    r = await call(m, p, m === 'GET' || m === 'DELETE' ? {} : { body: {} });
    record(id, m, label, 'anon', 401, r.status);
  }

  r = await call('POST', '/clubs', { token: tokA, body: { nombre: `${PREFIX}club_${ts}`, ubicacion: 'smoke', lat: -34.6, lng: -58.4 } });
  record(30, 'POST', '/clubs', 'user', 201, r.status);
  const clubId = r.json?.id;
  if (clubId) created.club_ids.push(clubId);
  r = await call('POST', `/clubs/${clubId}/join`, { token: tokOther });
  record(31, 'POST', '/clubs/:id/join', otherRole, '2xx', r.status, true, 'segundo usuario');
  r = await call('GET', `/clubs/${clubId}`, { token: tokA });
  record(33, 'GET', '/clubs/:id', 'user (admin del club)', 200, r.status);
  r = await call('PUT', `/clubs/${clubId}/current-book`, { token: tokA, body: { title: `${PREFIX}cb`, author: 'smoke' } });
  record(34, 'PUT', '/clubs/:id/current-book', 'user (club free)', 403, r.status, r.json?.code === 'PREMIUM_REQUIRED', 'gating Premium documentado');
  r = await call('PUT', `/clubs/${clubId}/upgrade`, { token: tokA });
  record(36, 'PUT', '/clubs/:id/upgrade', 'user (admin del club)', 200, r.status, r.json?.plan === 'premium');
  r = await call('PUT', `/clubs/${clubId}/current-book`, { token: tokA, body: { title: `${PREFIX}cb`, author: 'smoke' } });
  record(34, 'PUT', '/clubs/:id/current-book', 'user (club premium)', '2xx', r.status);
  r = await call('PUT', `/clubs/${clubId}/location`, { token: tokA, body: { lat: -34.61, lng: -58.41, ubicacion: `${PREFIX}ubic` } });
  record(35, 'PUT', '/clubs/:id/location', 'user (admin del club)', '2xx', r.status);
  r = await call('POST', `/clubs/${clubId}/meetings`, { token: tokA, body: { titulo: `${PREFIX}reunion`, fecha: new Date(Date.now() + 7 * 864e5).toISOString() } });
  record(37, 'POST', '/clubs/:id/meetings', 'user (admin del club)', '2xx', r.status);
  const meetingId = r.json?.id;
  r = await call('DELETE', `/clubs/${clubId}/meetings/${meetingId}`, { token: tokA });
  record(38, 'DELETE', '/clubs/:id/meetings/:meetingId', 'user (admin del club)', '2xx', r.status);
  r = await call('POST', `/clubs/${clubId}/posts`, { token: tokOther, body: { contenido: `${PREFIX}post` } });
  record(39, 'POST', '/clubs/:id/posts', `${otherRole} (miembro)`, '2xx', r.status);
  const postId = r.json?.id;
  r = await call('DELETE', `/clubs/${clubId}/posts/${postId}`, { token: tokOther });
  record(40, 'DELETE', '/clubs/:id/posts/:postId', `${otherRole} (autor)`, '2xx', r.status);
  r = await call('DELETE', `/clubs/${clubId}/leave`, { token: tokOther });
  record(32, 'DELETE', '/clubs/:id/leave', `${otherRole} (miembro)`, '2xx', r.status);
}

function teardownAndCount() {
  const arr = (xs) => `{${xs.filter((x) => Number.isInteger(Number(x)) && x !== null).map(Number).join(',')}}`;
  psql(['-1', '-v', `prefix=${PREFIX}`, '-v', `user_ids=${arr(created.user_ids)}`, '-v', `book_ids=${arr(created.book_ids)}`,
    '-v', `club_ids=${arr(created.club_ids)}`, '-v', `listing_ids=${arr(created.listing_ids)}`, '-f', TEARDOWN]);
  const countSql = `
SELECT 'users', count(*) FROM public.users WHERE id = ANY (:'user_ids'::int[]) OR username LIKE 'smoke\\_feat001\\_%'
UNION ALL SELECT 'books', count(*) FROM public.books WHERE id = ANY (:'book_ids'::int[]) OR title LIKE 'smoke\\_feat001\\_%'
UNION ALL SELECT 'book_requests', count(*) FROM public.book_requests WHERE user_id = ANY (:'user_ids'::int[]) OR book_id = ANY (:'book_ids'::int[])
UNION ALL SELECT 'book_request_messages', count(*) FROM public.book_request_messages WHERE sender_id = ANY (:'user_ids'::int[]) OR message LIKE 'smoke\\_feat001\\_%'
UNION ALL SELECT 'exchange_listings', count(*) FROM public.exchange_listings WHERE id = ANY (:'listing_ids'::int[]) OR title LIKE 'smoke\\_feat001\\_%'
UNION ALL SELECT 'exchange_requests', count(*) FROM public.exchange_requests WHERE requester_id = ANY (:'user_ids'::int[]) OR listing_id = ANY (:'listing_ids'::int[])
UNION ALL SELECT 'clubs', count(*) FROM public.clubs WHERE id = ANY (:'club_ids'::int[]) OR nombre LIKE 'smoke\\_feat001\\_%'
UNION ALL SELECT 'club_members', count(*) FROM public.club_members WHERE usuario_id = ANY (:'user_ids'::int[]) OR club_id = ANY (:'club_ids'::int[])
UNION ALL SELECT 'club_meetings', count(*) FROM public.club_meetings WHERE club_id = ANY (:'club_ids'::int[]) OR titulo LIKE 'smoke\\_feat001\\_%'
UNION ALL SELECT 'club_posts', count(*) FROM public.club_posts WHERE autor_id = ANY (:'user_ids'::int[]) OR club_id = ANY (:'club_ids'::int[]) OR contenido LIKE 'smoke\\_feat001\\_%';
`;
  const out = psql(['-F', '\t', '-v', `user_ids=${arr(created.user_ids)}`, '-v', `book_ids=${arr(created.book_ids)}`,
    '-v', `club_ids=${arr(created.club_ids)}`, '-v', `listing_ids=${arr(created.listing_ids)}`, '-f', '-'], countSql);
  return out.split('\n').filter(Boolean).map((l) => { const [table, n] = l.split('\t'); return { table, count: Number(n) }; });
}

let fatal = null;
try { await main(); } catch (e) { fatal = e.message; console.error(`ERROR durante el smoke: ${e.message}`); }

let counts = null; let teardownError = null;
try { counts = teardownAndCount(); } catch (e) { teardownError = e.message; console.error(`ERROR en teardown: ${e.message}`); }

const routes = new Map();
for (const r of rows) {
  if (r.route === LEGACY) continue;
  const s = routes.get(r.route) || { ok: 0, fail: 0, pending: 0 };
  if (r.result === 'OK') s.ok += 1; else if (r.result === 'FAIL') s.fail += 1; else s.pending += 1;
  routes.set(r.route, s);
}
const summary = {
  admin_credentials: HAS_ADMIN,
  logins_used: loginCount,
  checks: { ok: rows.filter((r) => r.result === 'OK').length, fail: rows.filter((r) => r.result === 'FAIL').length, pending: rows.filter((r) => r.result === 'PENDIENTE').length },
  routes_seen: routes.size,
  legacy_checks: rows.filter((r) => r.route === LEGACY).map((r) => `${r.method} ${r.path} -> ${r.got} ${r.result}`),
  routes_fail: [...routes].filter(([, s]) => s.fail > 0).map(([k]) => k),
  routes_with_pending_admin: [...routes].filter(([, s]) => s.fail === 0 && s.pending > 0).map(([k]) => k),
  routes_all_ok: [...routes].filter(([, s]) => s.fail === 0 && s.pending === 0).length,
  fatal, teardownError, counts,
  remaining_total: counts ? counts.reduce((a, c) => a + c.count, 0) : null,
};

fs.writeFileSync(RESULTS_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, summary, rows }, null, 2));
console.log('| # | Método | Ruta | Rol | Esperado | Obtenido | Resultado | Nota |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.route} | ${r.method} | \`${r.path}\` | ${r.role} | ${r.expected} | ${r.got} | ${r.result} | ${r.note} |`);
console.log('\nSUMMARY ' + JSON.stringify(summary));
process.exit(fatal || teardownError || summary.checks.fail > 0 || summary.remaining_total !== 0 ? 1 : 0);
