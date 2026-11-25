import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GiftBookCard from '../GiftBookCard';
import type { GiftBook } from '@/lib/gift-contract';

const BOOK: GiftBook = {
  id: 7,
  title: 'El misterio del faro',
  author: 'Ana Pérez',
  genreLabel: 'Misterio cozy',
  coverUrl: null,
  coverColor: '#91551F',
  why: 'Tiene la intriga justa para una tarde de lluvia.',
  dedication: 'Para que descubras al culpable antes que yo.',
  shareQuote: 'Una cita para compartir',
  buyUrl: 'https://www.buscalibre.com.ar/libros/search?q=faro',
};

const setClipboard = (value: unknown) => {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true });
};

describe('GiftBookCard', () => {
  afterEach(() => {
    setClipboard(undefined);
    vi.useRealTimers();
  });

  it('sin coverUrl muestra un bloque del color coverColor con el título', () => {
    render(<GiftBookCard book={BOOK} />);
    const titles = screen.getAllByText('El misterio del faro');
    const coverBlock = titles.map((node) => node.parentElement as HTMLElement).find((node) => node.style.backgroundColor);
    expect(coverBlock?.style.backgroundColor).toBe('rgb(145, 85, 31)');
    expect(screen.getByRole('heading', { level: 2, name: 'El misterio del faro' })).toBeInTheDocument();
    expect(screen.getByText('Misterio cozy')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
  });

  it('Comprar es un enlace seguro a buyUrl en una pestaña nueva', () => {
    render(<GiftBookCard book={BOOK} />);
    const link = screen.getByRole('link', { name: 'Comprar' });
    expect(link).toHaveAttribute('href', BOOK.buyUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('min-h-11');
  });

  it('sin buyUrl no muestra Comprar', () => {
    render(<GiftBookCard book={{ ...BOOK, buyUrl: null }} />);
    expect(screen.queryByRole('link', { name: 'Comprar' })).toBeNull();
  });

  it('Copiar dedicatoria copia el texto y confirma con ¡Copiada! durante 2 s', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    render(<GiftBookCard book={BOOK} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar dedicatoria' }));
    });
    expect(writeText).toHaveBeenCalledWith(BOOK.dedication);
    expect(screen.getByText('¡Copiada!')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole('button', { name: 'Copiar dedicatoria' })).toBeInTheDocument();
  });

  it('sin portapapeles no muestra el botón de copiar', () => {
    setClipboard(undefined);
    render(<GiftBookCard book={BOOK} />);
    expect(screen.queryByRole('button', { name: 'Copiar dedicatoria' })).toBeNull();
  });

  it('si la copia falla conserva el texto del botón', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denegado')) });
    render(<GiftBookCard book={BOOK} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar dedicatoria' }));
    });
    expect(screen.getByRole('button', { name: 'Copiar dedicatoria' })).toBeInTheDocument();
    expect(screen.queryByText('¡Copiada!')).toBeNull();
  });

  it('desmontar con la copia pendiente no actualiza el estado', async () => {
    let resolveCopy: () => void = () => {};
    setClipboard({ writeText: vi.fn(() => new Promise<void>((resolve) => { resolveCopy = resolve; })) });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(<GiftBookCard book={BOOK} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar dedicatoria' }));
    view.unmount();
    await act(async () => {
      resolveCopy();
    });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('Comprar, Copiar dedicatoria, género y título siguen el estilo de la tarjeta', () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    render(<GiftBookCard book={BOOK} />);
    expect(screen.getByRole('link', { name: 'Comprar' })).toHaveClass('min-h-11', 'bg-terracotta');
    expect(screen.getByRole('button', { name: 'Copiar dedicatoria' })).toHaveClass('h-11');
    expect(screen.getByText('Misterio cozy')).toHaveClass('pill', 'pill-sun');
    const title = screen.getByRole('heading', { level: 2, name: 'El misterio del faro' });
    expect(title).toHaveClass('font-serif', 'text-[22px]', 'text-forest');
  });
});
