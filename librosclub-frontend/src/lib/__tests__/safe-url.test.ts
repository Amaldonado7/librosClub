import { describe, it, expect } from 'vitest';
import { safeExternalUrl } from '../safe-url';
import { COVER_PALETTE, coverPaletteFor } from '../cover-palette';

describe('safeExternalUrl', () => {
  it.each(['http://example.com/libro', 'https://books.google.com/books?id=1'])('acepta %s', (url) => {
    expect(safeExternalUrl(url)).toBe(new URL(url).href);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.com',
    '/relativo',
    '',
    'no es url',
  ])('rechaza %s', (url) => {
    expect(safeExternalUrl(url)).toBeNull();
  });

  it('rechaza null y undefined', () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });
});

describe('coverPaletteFor', () => {
  it('es determinística', () => {
    expect(coverPaletteFor('Rayuela')).toBe(coverPaletteFor('Rayuela'));
  });

  it('siempre devuelve un par de la paleta', () => {
    ['', 'a', 'Rayuela', 'Cien años de soledad', '🙂📚'].forEach((seed) => {
      expect(COVER_PALETTE).toContain(coverPaletteFor(seed));
    });
  });

  it('seed vacío usa el primer par', () => {
    expect(coverPaletteFor('')).toBe(COVER_PALETTE[0]);
  });
});
