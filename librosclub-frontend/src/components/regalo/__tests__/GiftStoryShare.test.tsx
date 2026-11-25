import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GiftStoryShare from '../GiftStoryShare';
import { giftAPI } from '@/utils/api';
import { renderGiftStory, shareGiftStory, waitForStoryFonts } from '@/lib/gift-story';
import type { GiftBook } from '@/lib/gift-contract';

vi.mock('@/utils/api', () => ({
  giftAPI: { getCover: vi.fn() },
}));

vi.mock('@/lib/gift-story', () => ({
  waitForStoryFonts: vi.fn(),
  renderGiftStory: vi.fn(),
  shareGiftStory: vi.fn(),
}));

const getCover = vi.mocked(giftAPI.getCover);
const render$ = vi.mocked(renderGiftStory);
const share = vi.mocked(shareGiftStory);
const fonts = vi.mocked(waitForStoryFonts);

const book = (id: number, coverUrl: string | null = null): GiftBook => ({
  id,
  title: `Libro ${id}`,
  author: `Autora ${id}`,
  genreLabel: 'Género',
  coverUrl,
  coverColor: '#91551F',
  why: 'Por qué',
  dedication: `Dedicatoria ${id}`,
  shareQuote: `Cita ${id}`,
  buyUrl: null,
});

const BOOKS = [book(5, 'https://books.google.com/books/content?id=cinco'), book(6), book(7)];
const PNG = new Blob(['png'], { type: 'image/png' });

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderShare = (books = BOOKS, relationship = 'mama') =>
  render(<GiftStoryShare books={books} relationship={relationship} />);

const shareButton = () => screen.getByRole('button', { name: /Compartir en historias|Preparando tu placa…/ });

beforeEach(() => {
  getCover.mockReset().mockResolvedValue(null);
  render$.mockReset().mockResolvedValue(PNG);
  share.mockReset().mockResolvedValue('shared');
  fonts.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GiftStoryShare', () => {
  it('es un botón con nombre accesible y radios con el primer libro marcado', () => {
    renderShare();
    expect(screen.getByRole('button', { name: 'Compartir en historias' }).tagName).toBe('BUTTON');
    expect(screen.getByText('Libro para la placa')).toHaveClass('label-mono');
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    radios.forEach((radio) => expect(radio).toHaveAttribute('name', 'gift-story-book'));
    expect(screen.getByRole('radio', { name: 'Libro 5' })).toBeChecked();
    expect(getCover).not.toHaveBeenCalled();
  });

  it('pide la portada una sola vez con el id del libro y no hace otros fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const cover = new Blob(['jpg'], { type: 'image/jpeg' });
    getCover.mockResolvedValue(cover);
    renderShare();
    fireEvent.click(shareButton());
    await waitFor(() => expect(share).toHaveBeenCalledWith(PNG));
    expect(getCover).toHaveBeenCalledTimes(1);
    expect(getCover).toHaveBeenCalledWith(5);
    expect(fonts).toHaveBeenCalledTimes(1);
    expect(render$).toHaveBeenCalledWith({
      heading: 'MI REGALO PARA MAMÁ',
      book: { title: 'Libro 5', author: 'Autora 5', coverColor: '#91551F', shareQuote: 'Cita 5' },
      cover,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sin coverUrl no pide la portada y dibuja sin ella', async () => {
    renderShare([book(6), book(7), book(8)]);
    fireEvent.click(shareButton());
    await waitFor(() => expect(render$).toHaveBeenCalled());
    expect(getCover).not.toHaveBeenCalled();
    expect(render$.mock.calls[0][0].cover).toBeNull();
  });

  it('si la portada no llega dibuja sin ella y sin aviso', async () => {
    getCover.mockResolvedValue(null);
    renderShare();
    fireEvent.click(shareButton());
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(render$.mock.calls[0][0].cover).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mientras genera queda deshabilitado y avisa que está preparando la placa', async () => {
    const pending = deferred<Blob>();
    render$.mockReturnValue(pending.promise);
    renderShare();
    fireEvent.click(shareButton());
    await waitFor(() => expect(render$).toHaveBeenCalled());
    const busy = shareButton();
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toHaveTextContent('Preparando tu placa…');
    await act(async () => {
      pending.resolve(PNG);
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Compartir en historias' })).toBeEnabled());
    expect(shareButton()).toHaveAttribute('aria-busy', 'false');
    expect(document.activeElement).toBe(shareButton());
  });

  it.each(['shared', 'downloaded', 'cancelled'] as const)('con resultado %s vuelve sin aviso', async (outcome) => {
    share.mockResolvedValue(outcome);
    renderShare();
    fireEvent.click(shareButton());
    await waitFor(() => expect(share).toHaveBeenCalled());
    await waitFor(() => expect(shareButton()).toBeEnabled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('si la generación falla muestra el aviso, habilita el botón y le devuelve el foco', async () => {
    render$.mockRejectedValue(new Error('canvas'));
    renderShare();
    fireEvent.click(shareButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos preparar la placa. Probá de nuevo.');
    expect(shareButton()).toBeEnabled();
    expect(document.activeElement).toBe(shareButton());

    const pending = deferred<Blob>();
    render$.mockReturnValue(pending.promise);
    fireEvent.click(shareButton());
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    await act(async () => {
      pending.resolve(PNG);
    });
  });

  it('si compartir falla con otro error muestra el aviso', async () => {
    share.mockRejectedValue(new DOMException('sin activación', 'NotAllowedError'));
    renderShare();
    fireEvent.click(shareButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos preparar la placa. Probá de nuevo.');
  });

  it('usa el libro elegido en los radios', async () => {
    renderShare();
    fireEvent.click(screen.getByRole('radio', { name: 'Libro 6' }));
    expect(screen.getByRole('radio', { name: 'Libro 6' })).toBeChecked();
    fireEvent.click(shareButton());
    await waitFor(() => expect(render$).toHaveBeenCalled());
    expect(render$.mock.calls[0][0].book.title).toBe('Libro 6');
    expect(getCover).not.toHaveBeenCalled();
  });

  it('usa el encabezado del vínculo', async () => {
    renderShare(BOOKS, 'pareja');
    fireEvent.click(shareButton());
    await waitFor(() => expect(render$).toHaveBeenCalled());
    expect(render$.mock.calls[0][0].heading).toBe('MI REGALO PARA MI PAREJA');
  });

  it.each(['Enter', ' '])('se activa desde el teclado con %j', async (key) => {
    renderShare();
    const button = shareButton();
    button.focus();
    fireEvent.keyDown(button, { key });
    fireEvent.click(button);
    await waitFor(() => expect(render$).toHaveBeenCalledTimes(1));
  });

  it('no actualiza el estado si se desmonta durante la generación', async () => {
    const pending = deferred<Blob>();
    render$.mockReturnValue(pending.promise);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderShare();
    fireEvent.click(shareButton());
    await waitFor(() => expect(render$).toHaveBeenCalled());
    unmount();
    await act(async () => {
      pending.reject(new Error('tarde'));
    });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('no inicia una segunda generación mientras la primera sigue en curso', async () => {
    const pending = deferred<Blob>();
    render$.mockReturnValue(pending.promise);
    renderShare();
    const button = shareButton();
    fireEvent.click(button);
    await waitFor(() => expect(render$).toHaveBeenCalledTimes(1));
    fireEvent.click(button);
    expect(render$).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(PNG);
    });
  });
});
