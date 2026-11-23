const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const allowRoles = require('../roleMiddleware');

function run(user, roles = ['admin']) {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;
  allowRoles(...roles)({ user }, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

describe('roleMiddleware: allowRoles', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = mock.method(console, 'log', () => {});
  });

  afterEach(() => {
    logSpy.mock.restore();
  });

  it('debe llamar a next() cuando el rol está permitido', () => {
    const { res, nextCalled } = run({ userId: 1, role: 'admin' });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
    assert.equal(logSpy.mock.callCount(), 0);
  });

  it('debe responder 403 cuando no hay usuario', () => {
    const { res, nextCalled } = run(undefined);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { message: 'Acceso denegado' });
    assert.equal(logSpy.mock.callCount(), 0);
  });

  it('debe responder 403 cuando el rol no está permitido', () => {
    const { res, nextCalled } = run({ userId: 2, role: 'user' });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { message: 'Acceso denegado' });
    assert.equal(logSpy.mock.callCount(), 0);
  });
});
