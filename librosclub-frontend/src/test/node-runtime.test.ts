import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

describe('runtime de Node 24', () => {
  it('.nvmrc fija Node 24', () => {
    expect(readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim()).toBe('24');
  });

  it('engines.node es 24.x', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.engines?.node).toBe('24.x');
  });
});
