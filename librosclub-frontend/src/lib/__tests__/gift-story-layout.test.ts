import { describe, it, expect } from 'vitest';
import { wrapLines } from '@/lib/gift-story-layout';

const tenPx = (text: string) => text.length * 10;

describe('wrapLines', () => {
  it('deja un texto corto en una línea', () => {
    expect(wrapLines('Hola mundo', 300, 5, tenPx)).toEqual(['Hola mundo']);
  });

  it('colapsa espacios y recorta los bordes', () => {
    expect(wrapLines('  Hola     mundo  ', 300, 5, tenPx)).toEqual(['Hola mundo']);
  });

  it('corta por palabras sin superar el ancho', () => {
    const lines = wrapLines('uno dos tres cuatro cinco seis', 100, 5, tenPx);
    expect(lines).toEqual(['uno dos', 'tres', 'cuatro', 'cinco seis']);
    lines.forEach((line) => expect(tenPx(line)).toBeLessThanOrEqual(100));
  });

  it('con 200 caracteres y 5 líneas termina la última en … sin pasarse del ancho', () => {
    const text = Array.from({ length: 40 }, (_, i) => `pal${String(i).padStart(2, '0')}`).join(' ').slice(0, 200);
    const lines = wrapLines(text, 160, 5, tenPx);
    expect(lines).toHaveLength(5);
    expect(lines[4].endsWith('…')).toBe(true);
    lines.forEach((line) => expect(tenPx(line)).toBeLessThanOrEqual(160));
  });

  it('parte una palabra más ancha que el máximo', () => {
    const word = 'x'.repeat(60);
    const lines = wrapLines(`a ${word} b`, 250, 10, tenPx);
    expect(lines.join('').replace(/ /g, '')).toBe(`a${word}b`);
    lines.forEach((line) => expect(tenPx(line)).toBeLessThanOrEqual(250));
    expect(lines[0]).toBe('a');
  });

  it('devuelve [] para texto vacío o solo espacios', () => {
    expect(wrapLines('', 100, 3, tenPx)).toEqual([]);
    expect(wrapLines('    ', 100, 3, tenPx)).toEqual([]);
    expect(wrapLines('hola', 100, 0, tenPx)).toEqual([]);
  });

  it('120 caracteres a 20 px por carácter entran en ≤ 4 líneas de 840 px sin …', () => {
    const text = 'Una historia que te acompaña mucho después de cerrar el libro y que vas a querer contarle a todos tus amigos hoy mismo!!';
    expect(text).toHaveLength(120);
    const lines = wrapLines(text, 840, 5, (s) => s.length * 20);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines.some((line) => line.includes('…'))).toBe(false);
  });

  it('recorta hasta que la línea con … entra', () => {
    const lines = wrapLines('abcdefghij klmnopqrst uvwxyz', 100, 1, tenPx);
    expect(lines).toEqual(['abcdefghi…']);
  });
});
