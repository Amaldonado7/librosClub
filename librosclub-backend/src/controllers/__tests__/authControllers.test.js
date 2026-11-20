const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const dbPath = require.resolve(path.join(__dirname, '..', '..', 'config', 'db'));
const queries = [];
let responder = () => ({ rows: [] });
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return responder(sql, params);
    },
  },
};

const { login, register, upgrade } = require('../authControllers');

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

beforeEach(() => {
  queries.length = 0;
  responder = () => ({ rows: [] });
});

describe('authControllers.login', () => {
  it('debe responder 400 si falta usuario o contraseña', async () => {
    const res = fakeRes();
    await login({ body: { username: 'ana' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Usuario y contraseña son requeridos.');
    assert.equal(queries.length, 0);
  });

  it('debe responder 401 si el usuario no existe', async () => {
    const res = fakeRes();
    await login({ body: { username: 'nadie', password: 'x' } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Credenciales inválidas.');
  });

  it('debe responder 401 si la contraseña no coincide', async () => {
    const hash = await bcrypt.hash('correcta', 4);
    responder = () => ({ rows: [{ id: 1, username: 'ana', password: hash, role: 'user', plan: 'free' }] });
    const res = fakeRes();
    await login({ body: { username: 'ana', password: 'otra' } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Credenciales inválidas.');
  });

  it('debe devolver un token con plan premium vigente', async () => {
    const hash = await bcrypt.hash('correcta', 4);
    const future = new Date(Date.now() + 86400000).toISOString();
    responder = () => ({ rows: [{ id: 7, username: 'ana', password: hash, role: 'admin', plan: 'premium', plan_expires_at: future }] });
    const res = fakeRes();
    await login({ body: { username: 'ana', password: 'correcta' } }, res);
    assert.equal(res.statusCode, 200);
    const payload = jwt.verify(res.body.token, 'test-secret');
    assert.deepEqual(
      { userId: payload.userId, username: payload.username, role: payload.role, plan: payload.plan },
      { userId: 7, username: 'ana', role: 'admin', plan: 'premium' }
    );
  });

  it('debe degradar a free un premium vencido', async () => {
    const hash = await bcrypt.hash('correcta', 4);
    const past = new Date(Date.now() - 86400000).toISOString();
    responder = () => ({ rows: [{ id: 7, username: 'ana', password: hash, role: 'user', plan: 'premium', plan_expires_at: past }] });
    const res = fakeRes();
    await login({ body: { username: 'ana', password: 'correcta' } }, res);
    assert.equal(jwt.verify(res.body.token, 'test-secret').plan, 'free');
  });

  it('debe responder 500 si falla la base', async () => {
    responder = () => { throw new Error('db caída'); };
    const res = fakeRes();
    await login({ body: { username: 'ana', password: 'x' } }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Error del servidor');
  });
});

describe('authControllers.register', () => {
  it('debe responder 400 con contraseña de menos de 6 caracteres', async () => {
    const res = fakeRes();
    await register({ body: { username: 'ana', password: '12345' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'La contraseña debe tener al menos 6 caracteres.');
  });

  it('debe responder 409 si el usuario ya existe', async () => {
    responder = () => ({ rows: [{ id: 1 }] });
    const res = fakeRes();
    await register({ body: { username: 'ana', password: '123456' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, 'Ese usuario ya está registrado.');
  });

  it('debe crear el usuario con rol user y devolver token free', async () => {
    responder = (sql) => (sql.startsWith('INSERT')
      ? { rows: [{ id: 9, username: 'ana', role: 'user' }] }
      : { rows: [] });
    const res = fakeRes();
    await register({ body: { username: 'ana', password: '123456', role: 'admin' } }, res);
    assert.equal(res.statusCode, 201);
    const insert = queries.find((q) => q.sql.startsWith('INSERT'));
    assert.equal(insert.params[2], 'user');
    assert.notEqual(insert.params[1], '123456');
    assert.equal(jwt.verify(res.body.token, 'test-secret').plan, 'free');
  });
});

describe('authControllers.upgrade', () => {
  it('debe pasar a premium y devolver token premium', async () => {
    responder = (sql) => (sql.startsWith('SELECT')
      ? { rows: [{ id: 3, username: 'ana', role: 'user' }] }
      : { rows: [] });
    const res = fakeRes();
    await upgrade({ user: { userId: 3 }, body: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(queries[0].sql.startsWith('UPDATE'));
    assert.deepEqual(queries[0].params, [3]);
    assert.equal(jwt.verify(res.body.token, 'test-secret').plan, 'premium');
  });

  it('debe responder 500 si falla la actualización', async () => {
    responder = () => { throw new Error('db caída'); };
    const res = fakeRes();
    await upgrade({ user: { userId: 3 }, body: {} }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Error al actualizar el plan.');
  });
});
