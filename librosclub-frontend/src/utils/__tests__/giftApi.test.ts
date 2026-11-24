import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, giftAPI } from '../api';
import type { GiftAnswers } from '@/lib/gift-contract';

const ANSWERS: GiftAnswers = {
  relationship: 'mama',
  occasion: 'navidad',
  age: 'adulto',
  readingLevel: 'mensual',
  hook: 'misterio',
  kind: 'novela',
  length: 'mediano',
  tone: 'emotivo',
};

const book = (id: number) => ({
  id,
  title: `Libro ${id}`,
  author: 'Autora',
  genreLabel: 'Misterio cozy',
  coverUrl: null,
  coverColor: '#91551F',
  why: 'Porque sí',
  dedication: 'Para vos',
  shareQuote: 'Cita',
  buyUrl: `https://www.buscalibre.com.ar/libros/search?q=${id}`,
});

const VALID_BODY = { profile: { relationship: 'mama', occasion: 'navidad' }, books: [book(1), book(2), book(3)] };

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hangingFetch = () =>
  vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
  );

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('la promesa no fue rechazada');
};

describe('giftAPI.getRecommendations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('envía un único POST con las 8 respuestas, JSON y sin Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, VALID_BODY));
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('libros_token', 'token-de-sesion');

    const result = await giftAPI.getRecommendations(ANSWERS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/gift\/recommendations$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(ANSWERS);
    expect(Object.keys(JSON.parse(init.body as string))).toHaveLength(8);
    expect(result.books.map((b) => b.title)).toEqual(['Libro 1', 'Libro 2', 'Libro 3']);
    localStorage.removeItem('libros_token');
  });

  it.each([
    [400, 'invalid'],
    [413, 'invalid'],
    [429, 'rate_limited'],
    [503, 'unavailable'],
    [403, 'network'],
    [500, 'network'],
    [418, 'network'],
  ])('traduce %i a %s', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(status, { message: 'detalle del backend' })));
    const err = await rejection(giftAPI.getRecommendations(ANSWERS));
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(code);
    expect((err as ApiError).message).not.toContain('detalle del backend');
  });

  it('fetch rechazado se traduce a network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await rejection(giftAPI.getRecommendations(ANSWERS));
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('network');
  });

  it('sin respuesta, a los 10.000 ms aborta y rechaza con network', async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal('fetch', fetchMock);
    const pending = rejection(giftAPI.getRecommendations(ANSWERS));

    await vi.advanceTimersByTimeAsync(9999);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;
    expect(init.signal?.aborted).toBe(true);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('network');
  });

  it('abort externo rechaza con AbortError y no con ApiError', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const controller = new AbortController();
    const pending = rejection(giftAPI.getRecommendations(ANSWERS, { signal: controller.signal }));
    controller.abort();
    const err = await pending;
    expect(err).not.toBeInstanceOf(ApiError);
    expect((err as Error).name).toBe('AbortError');
  });

  it('una señal ya abortada rechaza con AbortError sin llamar a fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();
    const err = await rejection(giftAPI.getRecommendations(ANSWERS, { signal: controller.signal }));
    expect((err as Error).name).toBe('AbortError');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('200 con JSON inválido se traduce a network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no es json', { status: 200 })));
    const err = await rejection(giftAPI.getRecommendations(ANSWERS));
    expect((err as ApiError).code).toBe('network');
  });

  it('200 sin books se traduce a network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { profile: VALID_BODY.profile })));
    const err = await rejection(giftAPI.getRecommendations(ANSWERS));
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('network');
  });
});
