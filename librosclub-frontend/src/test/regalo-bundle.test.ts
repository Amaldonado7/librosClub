import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

const staticSpecifiers = (source: string) =>
  [
    ...source.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?\sfrom\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);

const INITIAL_CHUNK_MODULES = [
  'App.jsx',
  'components/LandingPage.tsx',
  'components/Dashboard.tsx',
  'components/AuthModal.tsx',
  'contexts/AuthContext.tsx',
  'utils/api.ts',
];

const REGALO_ONLY = /components\/regalo|(^|\/)regalo\/|lib\/gift-test/;

describe('separación del chunk de /regalo', () => {
  it('App.jsx carga RegaloPage con React.lazy', () => {
    expect(read('App.jsx')).toContain("lazy(() => import('./components/regalo/RegaloPage'))");
  });

  it.each(INITIAL_CHUNK_MODULES)('%s no importa estáticamente módulos exclusivos de /regalo', (rel) => {
    const offenders = staticSpecifiers(read(rel)).filter((specifier) => REGALO_ONLY.test(specifier));
    expect(offenders).toEqual([]);
  });

  it('utils/api.ts solo importa el contrato de lib/gift-contract', () => {
    const giftImports = staticSpecifiers(read('utils/api.ts')).filter((specifier) => specifier.includes('gift'));
    expect(giftImports.length).toBeGreaterThan(0);
    giftImports.forEach((specifier) => expect(specifier).toBe('@/lib/gift-contract'));
  });

  it('lib/gift-contract.ts no importa de utils, components ni lib/gift-test', () => {
    const specifiers = staticSpecifiers(read('lib/gift-contract.ts'));
    expect(specifiers.length).toBeGreaterThan(0);
    specifiers.forEach((specifier) => expect(specifier).not.toMatch(/utils\/|components\/|gift-test/));
  });

  it('ningún archivo de src/lib importa de utils', () => {
    const libFiles = readdirSync(join(SRC, 'lib')).filter((entry) => /\.(ts|tsx)$/.test(entry));
    expect(libFiles.length).toBeGreaterThan(0);
    const offenders = libFiles.filter((entry) =>
      staticSpecifiers(read(`lib/${entry}`)).some((specifier) => /^(@\/utils|\.\.\/utils)/.test(specifier)),
    );
    expect(offenders).toEqual([]);
  });

  it('el detector de imports reconoce imports estáticos y no los dinámicos', () => {
    const sample = [
      "import A from './components/regalo/RegaloPage';",
      "export { b } from '@/lib/gift-test';",
      "import './regalo/estilos.css';",
      "const C = lazy(() => import('./components/regalo/Otro'));",
    ].join('\n');
    expect(staticSpecifiers(sample)).toEqual([
      './components/regalo/RegaloPage',
      '@/lib/gift-test',
      './regalo/estilos.css',
    ]);
  });
});
