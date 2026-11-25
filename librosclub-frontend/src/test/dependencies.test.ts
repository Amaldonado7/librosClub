import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

describe('dependencias del frontend', () => {
  it.each(['zod', '@hookform/resolvers', '@tailwindcss/typography', 'lovable-tagger'])(
    'package.json no incluye %s',
    (name) => {
      expect(allDeps).not.toHaveProperty(name);
    },
  );

  it('vitest y @vitest/coverage-v8 tienen la misma versión exacta', () => {
    expect(allDeps.vitest).toMatch(/^\d+\.\d+\.\d+$/);
    expect(allDeps['@vitest/coverage-v8']).toBe(allDeps.vitest);
  });

  it('vite es 8.x', () => {
    expect(allDeps.vite).toMatch(/^8\.\d+\.\d+$/);
  });

  it('react-router-dom es 7.x', () => {
    expect(allDeps['react-router-dom']).toMatch(/^7\.\d+\.\d+$/);
  });
});
