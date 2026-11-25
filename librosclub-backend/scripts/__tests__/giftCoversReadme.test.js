const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const README = path.join(__dirname, '..', '..', '..', 'README.md');

function migrationsSection() {
  const text = fs.readFileSync(README, 'utf8');
  const start = text.indexOf('#### Migraciones');
  assert.notEqual(start, -1, 'falta la sección #### Migraciones en README.md');
  const rest = text.slice(start + '#### Migraciones'.length);
  const next = rest.search(/\n#{1,4} /);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('README: migración 004 y flujo de portadas', () => {
  it('documenta cómo aplicar 004 en local y en producción', () => {
    const section = migrationsSection();
    assert.ok(section.includes('psql -d librosclub -f migrations/004_update_gift_books_covers.sql'));
    assert.ok(section.includes('psql -v ON_ERROR_STOP=1 -d librosclub -f migrations/004_update_gift_books_covers.sql'));
  });

  it('describe el flujo de portadas en orden', () => {
    const section = migrationsSection();
    const steps = ['covers:gift:find', 'covers:gift:apply', 'seed:gift:build'].map((step) => {
      const index = section.indexOf(`npm run ${step}`, section.indexOf('npm run covers:gift:find'));
      assert.notEqual(index, -1, `falta npm run ${step}`);
      return index;
    });
    assert.ok(steps[0] < steps[1] && steps[1] < steps[2], `orden inesperado: ${steps.join(', ')}`);
  });
});
