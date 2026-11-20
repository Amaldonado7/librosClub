import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

type HeaderRule = { source: string; headers: { key: string; value: string }[] };
type VercelConfig = {
  rewrites?: { source: string; destination: string }[];
  headers?: HeaderRule[];
};

const vercel: VercelConfig = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const viteConfig = readFileSync(join(ROOT, 'vite.config.js'), 'utf8');

const globalHeaders = () => {
  const rule = vercel.headers?.find((h) => h.source === '/(.*)');
  return Object.fromEntries((rule?.headers ?? []).map(({ key, value }) => [key, value]));
};

const cspDirectives = () =>
  Object.fromEntries(
    (globalHeaders()['Content-Security-Policy'] ?? '')
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...sources] = d.split(/\s+/);
        return [name, sources];
      }),
  ) as Record<string, string[]>;

describe('vercel.json', () => {
  it('conserva el rewrite SPA', () => {
    expect(vercel.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
  });

  it('define la Content-Security-Policy completa', () => {
    const csp = cspDirectives();
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['script-src']).toEqual(["'self'"]);
    expect(csp['style-src']).toEqual(["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
    expect(csp['font-src']).toEqual(['https://fonts.gstatic.com']);
    expect(csp['img-src']).toEqual(["'self'", 'data:', 'blob:', 'https:']);
    expect(csp['connect-src']).toEqual([
      "'self'",
      'https://librosclub-production.up.railway.app',
      'https://nominatim.openstreetmap.org',
    ]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
    expect(csp['upgrade-insecure-requests']).toEqual([]);
  });

  it('no permite eval ni comodines en script-src y connect-src', () => {
    const csp = cspDirectives();
    for (const directive of ['script-src', 'connect-src']) {
      expect(csp[directive]).toBeDefined();
      expect(csp[directive]).not.toContain("'unsafe-eval'");
      expect(csp[directive]).not.toContain('*');
    }
  });

  it('define los headers de seguridad complementarios', () => {
    const headers = globalHeaders();
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toBe('geolocation=(self), camera=(), microphone=()');
  });
});

describe('vite.config.js', () => {
  it('limita el dev server a localhost', () => {
    expect(viteConfig).toMatch(/host:\s*["']localhost["']/);
    expect(viteConfig).not.toMatch(/host:\s*["']::["']/);
  });
});
