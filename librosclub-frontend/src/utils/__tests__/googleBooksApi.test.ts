import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, booksAPI } from '../api';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('la promesa no fue rechazada');
};

const calls = {
  search: () => booksAPI.searchGoogleBooks('borges'),
  feed: () => booksAPI.getGoogleFeed('fiction', 0),
};

describe('booksAPI de Google Books', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe.each(Object.entries(calls))('%s', (_name, call) => {
    it('un 429 lanza ApiError con código rate_limited', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(429, { message: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.' }),
      );

      const err = await rejection(call());

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe('rate_limited');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('un 500 lanza el error genérico sin código', async () => {
      fetchMock.mockResolvedValue(jsonResponse(500, { message: 'x' }));

      const err = await rejection(call());

      expect(err).toBeInstanceOf(Error);
      expect((err as ApiError).code).toBeUndefined();
    });

    it('una respuesta exitosa devuelve el body', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));

      await expect(call()).resolves.toEqual({ items: [] });
    });
  });

  it('un 500 mantiene los mensajes de siempre', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));
    await expect(calls.search()).rejects.toThrow('Failed to search Google Books');

    fetchMock.mockResolvedValue(jsonResponse(500, {}));
    await expect(calls.feed()).rejects.toThrow('Failed to fetch Google Books feed');
  });
});
