import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RegaloPage from '../RegaloPage';

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
    }
  }
  return {
    ApiError,
    getRecommendations: vi.fn(),
  };
});

vi.mock('@/utils/api', () => ({
  ApiError: mocks.ApiError,
  giftAPI: { getRecommendations: mocks.getRecommendations },
}));

const ANSWERS = {
  relationship: 'mama',
  occasion: 'navidad',
  age: 'adulto',
  readingLevel: 'mensual',
  hook: 'misterio',
  kind: 'novela',
  length: 'mediano',
  tone: 'emotivo',
};

const LABELS = [
  'Mi mamá',
  'Navidad',
  'Entre 31 y 60',
  'Un libro por mes',
  'Descubrir quién fue',
  'Novelas',
  'Ni muy corto ni muy largo',
  'Emotivo, que lo toque',
];

const book = (id: number) => ({
  id,
  title: `Libro ${id}`,
  author: `Autora ${id}`,
  genreLabel: `Género ${id}`,
  coverUrl: null,
  coverColor: '#91551F',
  why: `Por qué ${id}`,
  dedication: `Dedicatoria ${id}`,
  shareQuote: `Cita ${id}`,
  buyUrl: `https://www.buscalibre.com.ar/libros/search?q=${id}`,
});

const RESULT = { profile: { relationship: 'mama', occasion: 'navidad' }, books: [book(1), book(2), book(3)] };

const LOADING_TEXT = 'Buscando entre los estantes…';
const NETWORK_TEXT = 'No pudimos buscar libros ahora. Revisá tu conexión y probá de nuevo.';

const renderPage = () => render(<RegaloPage />);

const completeTest = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Empezar el test' }));
  for (const label of LABELS) {
    fireEvent.click(screen.getByRole('radio', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  }
};

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const resolveAfter = <T,>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const rejectAfter = (ms: number, error: unknown) =>
  new Promise((_resolve, reject) => setTimeout(() => reject(error), ms));

describe('RegaloPage — envío, carga y errores', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getRecommendations.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Siguiente en la pregunta 8 envía una sola vez las 8 respuestas y muestra la carga', async () => {
    mocks.getRecommendations.mockImplementation(() => resolveAfter(200, RESULT));
    renderPage();
    completeTest();

    expect(mocks.getRecommendations).toHaveBeenCalledTimes(1);
    const [payload, options] = mocks.getRecommendations.mock.calls[0];
    expect(payload).toEqual(ANSWERS);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(screen.getByRole('heading', { name: LOADING_TEXT })).toBeInTheDocument();
    expect(screen.getByText('Estamos eligiendo tres libros que tengan la onda de tu mamá.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('la carga se ve al menos 1,5 s aunque la respuesta llegue a los 200 ms', async () => {
    mocks.getRecommendations.mockImplementation(() => resolveAfter(200, RESULT));
    renderPage();
    completeTest();

    await advance(1499);
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();

    await advance(1);
    expect(screen.queryByText(LOADING_TEXT)).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Tres libros para tu mamá' })).toBeInTheDocument();
    expect(screen.getByText('PARA MAMÁ · NAVIDAD')).toBeInTheDocument();
  });

  it('desde el resultado, Hacer el test para otra persona vuelve al inicio con respuestas vacías', async () => {
    mocks.getRecommendations.mockImplementation(() => resolveAfter(100, RESULT));
    renderPage();
    completeTest();
    await advance(1500);

    fireEvent.click(screen.getByRole('button', { name: 'Hacer el test para otra persona' }));
    expect(screen.getByRole('heading', { name: 'El libro justo para cada persona' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar el test' }));
    expect(screen.getByText('PREGUNTA 1 DE 8')).toBeInTheDocument();
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('error network tras 10 s muestra el mensaje de conexión con Reintentar', async () => {
    mocks.getRecommendations.mockImplementation(() => rejectAfter(10000, new mocks.ApiError('x', 'network')));
    renderPage();
    completeTest();

    await advance(9999);
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    await advance(1);
    expect(screen.getByRole('alert')).toHaveTextContent(NETWORK_TEXT);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: NETWORK_TEXT }));
  });

  it('rate_limited muestra su mensaje y Reintentar reenvía las mismas respuestas', async () => {
    mocks.getRecommendations.mockImplementationOnce(() => rejectAfter(100, new mocks.ApiError('x', 'rate_limited')));
    mocks.getRecommendations.mockImplementationOnce(() => resolveAfter(100, RESULT));
    renderPage();
    completeTest();
    await advance(1500);

    expect(screen.getByText('Hiciste muchos tests seguidos. Probá de nuevo en unos minutos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(mocks.getRecommendations).toHaveBeenCalledTimes(2);
    expect(mocks.getRecommendations.mock.calls[1][0]).toEqual(ANSWERS);
    expect(mocks.getRecommendations.mock.calls[1][0]).toEqual(mocks.getRecommendations.mock.calls[0][0]);
  });

  it('invalid muestra su mensaje y Empezar de nuevo vuelve al inicio sin respuestas', async () => {
    mocks.getRecommendations.mockImplementation(() => rejectAfter(100, new mocks.ApiError('x', 'invalid')));
    renderPage();
    completeTest();
    await advance(1500);

    expect(screen.getByText('Algo salió mal con tus respuestas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));
    expect(screen.getByRole('heading', { name: 'El libro justo para cada persona' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar el test' }));
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
  });

  it('unavailable muestra su mensaje con Reintentar', async () => {
    mocks.getRecommendations.mockImplementation(() => rejectAfter(100, new mocks.ApiError('x', 'unavailable')));
    renderPage();
    completeTest();
    await advance(1500);

    expect(screen.getByText('Ahora no tenemos libros para recomendar. Probá más tarde.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('network por 500 muestra el mensaje genérico con Reintentar', async () => {
    mocks.getRecommendations.mockImplementation(() => rejectAfter(100, new mocks.ApiError('x', 'network')));
    renderPage();
    completeTest();
    await advance(1500);

    expect(screen.getByText(NETWORK_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toHaveClass('h-14');
  });

  it('un error que no es ApiError muestra el mensaje genérico', async () => {
    mocks.getRecommendations.mockImplementation(() => rejectAfter(100, new Error('boom')));
    renderPage();
    completeTest();
    await advance(1500);

    expect(screen.getByText(NETWORK_TEXT)).toBeInTheDocument();
  });

  it('desmontar durante la carga aborta el pedido sin actualizar el estado', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let receivedSignal: AbortSignal | undefined;
    mocks.getRecommendations.mockImplementation(
      (_answers: unknown, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          receivedSignal = signal;
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const view = renderPage();
    completeTest();
    view.unmount();

    expect(receivedSignal?.aborted).toBe(true);
    await advance(2000);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('la carga tiene fondo marrón y el resultado fondo crema', async () => {
    mocks.getRecommendations.mockImplementation(() => resolveAfter(200, RESULT));
    const { container } = renderPage();
    completeTest();

    const page = () => container.querySelector('[data-screen]');
    expect(page()).toHaveAttribute('data-screen', 'loading');
    expect(page()).toHaveClass('bg-wood-dark', 'text-warm-cream');

    await advance(1500);
    expect(page()).toHaveAttribute('data-screen', 'result');
    expect(page()).toHaveClass('bg-warm-cream', 'text-wood-dark');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
