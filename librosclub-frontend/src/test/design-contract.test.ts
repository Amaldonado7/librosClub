import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');

const read = (path: string) => readFileSync(path, 'utf8');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const toPosix = (path: string) => relative(ROOT, path).split(sep).join('/');

const isExcluded = (relPath: string) =>
  /\.test\.[jt]sx?$/.test(relPath) ||
  relPath.startsWith('src/test/');

const sourceFiles = () =>
  walk(SRC)
    .filter((file) => /\.(ts|tsx|jsx|css)$/.test(file))
    .map((file) => ({ file, rel: toPosix(file) }))
    .filter(({ rel }) => !isExcluded(rel));

const indexHtml = read(join(ROOT, 'index.html'));
const indexCss = read(join(SRC, 'index.css'));
const tailwindConfig = read(join(ROOT, 'tailwind.config.ts'));
const appJsx = read(join(SRC, 'App.jsx'));

describe('fuentes', () => {
  it('index.html precarga Google Fonts con una única URL de las tres familias', () => {
    expect(indexHtml).toMatch(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
    expect(indexHtml).toMatch(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);

    const urls = indexHtml.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g) ?? [];
    expect(urls).toHaveLength(1);
    const [url] = urls;
    expect(url).toContain('Sorts+Mill+Goudy');
    expect(url).toContain('IBM+Plex+Mono');
    expect(url).toContain('Beth+Ellen');
    expect(url).toContain('display=swap');

    const families = new URL(url.replace(/&amp;/g, '&')).searchParams.getAll('family');
    const combinations = families.reduce((total, family) => {
      const axes = family.split(':')[1];
      if (!axes) return total + 1;
      const values = axes.split('@')[1] ?? '';
      return total + values.split(';').filter(Boolean).length;
    }, 0);
    expect(combinations).toBeLessThanOrEqual(8);
  });

  it('ningún archivo fuente referencia las fuentes anteriores', () => {
    const forbidden = [['Lo', 'ra'].join(''), ['Space', ' Mono'].join('')];
    const offenders = [...sourceFiles(), { file: join(ROOT, 'index.html'), rel: 'index.html' }]
      .filter(({ file }) => forbidden.some((name) => read(file).includes(name)))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});

describe('marco lomo y grilla de portadas', () => {
  it('index.css define .cover-spine con overlay ::after y .cover-grid', () => {
    expect(indexCss).toMatch(/\.cover-spine::after\s*\{[^}]*box-shadow:\s*inset/);
    expect(indexCss).toMatch(/\.cover-grid\s*\{/);
  });

  it('ningún componente reimplementa la sombra del lomo', () => {
    const components = sourceFiles().filter(({ rel }) => rel.startsWith('src/components/'));
    const offenders = components
      .filter(({ file }) => /inset 7px|shadow-spine/.test(read(file)))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});

describe('tokens', () => {
  it('index.css define los tokens nuevos y conserva los de marca', () => {
    const expected = [
      '--surface: 41.5 100% 97.5%',
      '--line: 42 40.8% 80.8%',
      '--line-strong: 42.4 29.9% 73.1%',
      '--forest: 53 41% 26%',
      '--terracotta: 28 65% 35%',
      '--wood-dark: 24 64% 17%',
      '--sunlight: 48 85% 67%',
      '--warm-cream: 40 57% 93%',
    ];
    for (const token of expected) {
      expect(indexCss).toContain(`${token};`);
    }
  });

  it('tailwind.config.ts mapea los colores y radios nuevos', () => {
    expect(tailwindConfig).toMatch(/surface:\s*"hsl\(var\(--surface\)\)"/);
    expect(tailwindConfig).toMatch(/DEFAULT:\s*"hsl\(var\(--line\)\)"/);
    expect(tailwindConfig).toMatch(/strong:\s*"hsl\(var\(--line-strong\)\)"/);
    expect(tailwindConfig).toMatch(/btn:\s*"4px"/);
    expect(tailwindConfig).toMatch(/pill:\s*"999px"/);
  });
});

describe('movimiento reducido', () => {
  it('index.css respeta prefers-reduced-motion y App envuelve con MotionConfig', () => {
    expect(indexCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(appJsx).toContain('reducedMotion="user"');
  });
});

describe('pantallas secundarias y escala amber', () => {
  it('NotFound y Login no usan fuentes anteriores ni radios grandes', () => {
    const forbidden = [['Lo', 'ra'].join(''), ['Space', ' Mono'].join(''), 'rounded-xl', 'rounded-2xl'];
    for (const rel of ['pages/NotFound.tsx', 'components/Login.tsx']) {
      const content = read(join(SRC, rel));
      forbidden.forEach((token) => expect(content, `${rel} contiene ${token}`).not.toContain(token));
    }
  });

  it('ningún componente de pantalla usa la escala amber', () => {
    const componentsDir = join(SRC, 'components');
    const offenders = readdirSync(componentsDir)
      .filter((entry) => entry.endsWith('.tsx'))
      .filter((entry) => read(join(componentsDir, entry)).includes('amber-'));
    expect(offenders).toEqual([]);
  });
});

describe('favicon', () => {
  const favicon = read(join(ROOT, 'public', 'favicon.svg'));
  const circles = favicon.match(/<circle\b[^>]*>/g) ?? [];
  const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

  it('dibuja la flor amarilla sola, sin fondo, con contorno wood-dark', () => {
    expect(favicon).not.toMatch(/<rect\b/);
    expect(favicon).not.toContain('#5E5827');

    const petals = circles.filter((tag) => attr(tag, 'r') === '26' && attr(tag, 'fill') === '#F2D661');
    expect(petals).toHaveLength(8);

    const ringPaths = favicon.match(/<path\b[^>]*fill-rule="evenodd"[^>]*>/g) ?? [];
    expect(ringPaths.some((tag) => attr(tag, 'fill') === '#F2D661')).toBe(true);
    expect(ringPaths.every((tag) => /a34 34 0 1 0/.test(attr(tag, 'd') ?? ''))).toBe(true);

    expect(favicon).toMatch(/<g\b[^>]*stroke="#492710"[^>]*stroke-width="12"/);
  });

  it('no contiene contenido activo ni referencias externas', () => {
    const withoutNamespace = favicon.replace(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/, '');
    ['<script', '<foreignObject', '<text', 'http', 'href', 'url('].forEach((token) =>
      expect(withoutNamespace).not.toContain(token),
    );
  });

  it('index.html referencia el favicon SVG', () => {
    expect(indexHtml).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);
  });
});
