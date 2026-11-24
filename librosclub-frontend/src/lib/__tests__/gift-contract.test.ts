import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { ANSWER_VALUES, parseGiftResponse } from '@/lib/gift-contract';
import { coverPaletteFor } from '@/lib/cover-palette';

const book = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Libro ${id}`,
  author: 'Autora',
  genreLabel: 'Misterio cozy',
  coverUrl: `https://covers.example.com/${id}.jpg`,
  coverColor: '#91551F',
  why: 'Porque sí',
  dedication: 'Para vos',
  shareQuote: 'Cita',
  buyUrl: `https://www.buscalibre.com.ar/libros/search?q=${id}`,
  ...overrides,
});

const response = (books: unknown[], profile: unknown = { relationship: 'mama', occasion: 'navidad' }) => ({
  profile,
  books,
});

describe('parseGiftResponse', () => {
  it('devuelve perfil y libros con forma válida', () => {
    const parsed = parseGiftResponse(response([book(1), book(2), book(3)]));
    expect(parsed?.profile).toEqual({ relationship: 'mama', occasion: 'navidad' });
    expect(parsed?.books[0]).toMatchObject({
      id: 1,
      title: 'Libro 1',
      coverUrl: 'https://covers.example.com/1.jpg',
      coverColor: '#91551F',
      buyUrl: 'https://www.buscalibre.com.ar/libros/search?q=1',
    });
  });

  it('descarta coverUrl y buyUrl con protocolo javascript:', () => {
    const parsed = parseGiftResponse(
      response([book(1, { coverUrl: 'javascript:alert(1)', buyUrl: 'javascript:alert(2)' }), book(2), book(3)]),
    );
    expect(parsed?.books[0].coverUrl).toBeNull();
    expect(parsed?.books[0].buyUrl).toBeNull();
  });

  it('coverUrl null se conserva como null', () => {
    const parsed = parseGiftResponse(response([book(1, { coverUrl: null }), book(2), book(3)]));
    expect(parsed?.books[0].coverUrl).toBeNull();
  });

  it('coverColor inválido usa el color de la paleta por título', () => {
    const parsed = parseGiftResponse(response([book(1, { coverColor: 'red;background:url(x)' }), book(2), book(3)]));
    expect(parsed?.books[0].coverColor).toBe(coverPaletteFor('Libro 1').bg);
  });

  it('con más de 3 libros toma los primeros 3 en orden', () => {
    const parsed = parseGiftResponse(response([book(1), book(2), book(3), book(4)]));
    expect(parsed?.books.map((b) => b.id)).toEqual([1, 2, 3]);
  });

  it('id o shareQuote ausentes no invalidan el libro', () => {
    const { id: _id, shareQuote: _quote, ...rest } = book(1);
    const parsed = parseGiftResponse(response([rest, book(2), book(3)]));
    expect(parsed?.books[0].id).toBe(0);
    expect(parsed?.books[0].shareQuote).toBe('');
  });

  it.each([
    ['books con 2 libros', response([book(1), book(2)])],
    ['books ausente', { profile: { relationship: 'mama', occasion: 'navidad' } }],
    ['profile ausente', { books: [book(1), book(2), book(3)] }],
    ['profile sin occasion', response([book(1), book(2), book(3)], { relationship: 'mama' })],
    ['libro sin título', response([book(1, { title: undefined }), book(2), book(3)])],
    ['coverUrl numérico', response([book(1, { coverUrl: 5 }), book(2), book(3)])],
    ['libro no objeto', response(['x', book(2), book(3)])],
    ['json null', null],
    ['json string', 'hola'],
    ['json array', []],
  ])('%s → null', (_name, json) => {
    expect(parseGiftResponse(json)).toBeNull();
  });
});

describe('ANSWER_VALUES', () => {
  it('coincide con giftValues.js del backend en claves, valores y orden', () => {
    const require = createRequire(import.meta.url);
    const backend = require('../../../../librosclub-backend/src/services/giftValues.js') as {
      ANSWER_FIELDS: string[];
      ANSWER_VALUES: Record<string, string[]>;
    };
    expect(Object.keys(ANSWER_VALUES)).toEqual([...backend.ANSWER_FIELDS]);
    expect(Object.keys(ANSWER_VALUES)).toEqual(Object.keys(backend.ANSWER_VALUES));
    const normalized = Object.fromEntries(
      Object.entries(backend.ANSWER_VALUES).map(([field, values]) => [field, [...values]]),
    );
    expect(ANSWER_VALUES).toEqual(normalized);
  });
});
