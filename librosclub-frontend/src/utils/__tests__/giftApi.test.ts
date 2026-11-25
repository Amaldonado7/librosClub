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

describe('giftAPI.getCover', () => {
  const EXPECTED_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
  const imageResponse = (type = 'image/jpeg', status = 200) =>
    new Response(new Uint8Array([1, 2, 3]), { status, headers: { 'Content-Type': type } });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('hace un único GET sin cuerpo ni Authorization a /gift/covers/{id} en modo cors y devuelve el blob', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse());
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('libros_token', 'token-de-sesion');

    const blob = await giftAPI.getCover(5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${EXPECTED_BASE}/gift/covers/5`);
    expect(url).not.toContain('books.google.com');
    expect(init.mode).toBe('cors');
    expect(init.credentials).toBe('omit');
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(blob).not.toBeNull();
    expect(blob?.size).toBe(3);
    localStorage.removeItem('libros_token');
  });

  it.each(['image/png', 'image/webp; charset=binary', 'IMAGE/JPEG'])('acepta %s', async (type) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse(type)));
    const blob = await giftAPI.getCover(5);
    expect(blob?.size).toBe(3);
  });

  it.each([0, -1, 1.5, Number.NaN, 2147483648])('devuelve null sin llamar a fetch con id %s', async (id) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await giftAPI.getCover(id)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devuelve null ante 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(502, { message: 'No pudimos obtener la portada.' })));
    expect(await giftAPI.getCover(5)).toBeNull();
  });

  it.each(['text/html', 'image/svg+xml', ''])('devuelve null ante 200 con tipo %s', async (type) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse(type)));
    expect(await giftAPI.getCover(5)).toBeNull();
  });

  it('devuelve null a los 2,5 s si fetch se cuelga', async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal('fetch', fetchMock);
    let settled = false;
    const pending = giftAPI.getCover(5).then((value) => {
      settled = true;
      return value;
    });
    await vi.advanceTimersByTimeAsync(2499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBeNull();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal?.aborted).toBe(true);
  });

  it('respeta un timeoutMs propio', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const pending = giftAPI.getCover(5, { timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toBeNull();
  });

  it('devuelve null si fetch rechaza', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await giftAPI.getCover(5)).toBeNull();
  });

  it('devuelve null si el llamador aborta', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const controller = new AbortController();
    const pending = giftAPI.getCover(5, { signal: controller.signal });
    controller.abort();
    expect(await pending).toBeNull();
  });

  it('devuelve null sin llamar a fetch si la señal ya está abortada', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();
    expect(await giftAPI.getCover(5, { signal: controller.signal })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devuelve null si leer el cuerpo falla', async () => {
    const response = imageResponse();
    vi.spyOn(response, 'blob').mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    expect(await giftAPI.getCover(5)).toBeNull();
  });
});
