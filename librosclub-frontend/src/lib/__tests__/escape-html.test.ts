import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../escape-html';

describe('escapeHtml', () => {
  it('escapa etiquetas de script', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapa la ruptura de atributos', () => {
    expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe(
      '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;',
    );
  });

  it('escapa comillas simples', () => {
    expect(escapeHtml("O'Brien")).toBe('O&#39;Brien');
  });

  it('escapa siempre el ampersand, incluso entidades ya presentes', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('null y undefined devuelven cadena vacía', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('convierte números a string', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});
