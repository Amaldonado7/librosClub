const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

const sourceFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full);
    }
    return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [full] : [];
  });

describe('runtime de Node 24', () => {
  it('.nvmrc fija Node 24', () => {
    assert.equal(fs.readFileSync(path.join(ROOT, '.nvmrc'), 'utf8').trim(), '24');
  });

  it('engines.node es 24.x', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.engines.node, '24.x');
  });

  it('ningún archivo de src/ ni scripts/ usa node-fetch', () => {
    const files = [...sourceFiles(path.join(ROOT, 'src')), ...sourceFiles(path.join(ROOT, 'scripts'))];
    assert.ok(files.length > 0);
    const offenders = files.filter((file) => fs.readFileSync(file, 'utf8').includes('node-fetch'));
    assert.deepEqual(offenders, []);
  });

  it('corre sobre Node 24 cuando ENFORCE_NODE_24=1', { skip: process.env.ENFORCE_NODE_24 !== '1' }, () => {
    assert.ok(process.versions.node.startsWith('24.'), `Node ${process.versions.node}`);
  });
});
