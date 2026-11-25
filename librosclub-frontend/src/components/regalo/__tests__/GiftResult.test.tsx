import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GiftResult from '../GiftResult';
import type { GiftResponse } from '@/lib/gift-contract';

const book = (id: number) => ({
  id,
  title: `Libro ${id}`,
  author: `Autora ${id}`,
  genreLabel: `Género ${id}`,
  coverUrl: null,
  coverColor: '#91551F',
  why: `Por qué ${id}`,
  dedication: `Dedicatoria ${id}`,
  shareQuote: `Cita para compartir ${id}`,
  buyUrl: `https://www.buscalibre.com.ar/libros/search?q=${id}`,
});

const RESULT: GiftResponse = {
  profile: { relationship: 'mama', occasion: 'navidad' },
  books: [book(1), book(2), book(3)],
};

const renderResult = (onRestart = vi.fn()) => render(<GiftResult result={RESULT} onRestart={onRestart} />);

describe('GiftResult', () => {
  it('muestra encabezado, título enfocado y leyenda', () => {
    renderResult();
    expect(screen.getByText('PARA MAMÁ · NAVIDAD')).toHaveClass('label-mono');
    const title = screen.getByRole('heading', { level: 1, name: 'Tres libros para tu mamá' });
    expect(document.activeElement).toBe(title);
    expect(title).toHaveClass('font-serif', 'text-[34px]', 'leading-[1.1]');
    expect(screen.getByText('elegidos con cariño')).toHaveClass('accent-hand');
  });

  it('lista los 3 libros en orden con todos sus datos y sin shareQuote', () => {
    renderResult();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    items.forEach((item, index) => {
      const n = index + 1;
      const scoped = within(item);
      expect(scoped.getByRole('heading', { level: 2, name: `Libro ${n}` })).toBeInTheDocument();
      expect(scoped.getByText(`Género ${n}`)).toBeInTheDocument();
      expect(scoped.getByText(`Autora ${n}`)).toBeInTheDocument();
      expect(scoped.getByText(`Por qué ${n}`)).toBeInTheDocument();
      expect(scoped.getByText('Dedicatoria sugerida')).toBeInTheDocument();
      expect(scoped.getByText(`Dedicatoria ${n}`)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Cita para compartir/)).toBeNull();
  });

  it('Hacer el test para otra persona llama onRestart', () => {
    const onRestart = vi.fn();
    renderResult(onRestart);
    const button = screen.getByRole('button', { name: 'Hacer el test para otra persona' });
    expect(button).toHaveClass('h-14', 'w-full');
    fireEvent.click(button);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('se renderiza sin router ni sesión y no ofrece registro ni acceso a LibrosClub', () => {
    renderResult();
    expect(screen.queryByText('Registrarme')).toBeNull();
    expect(screen.queryByText('Ir a LibrosClub')).toBeNull();
    expect(screen.queryByText('Sumate a LibrosClub')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('aplica el estilo del canvas al encabezado y a cada tarjeta', () => {
    const { container } = renderResult();
    expect(container.querySelector('header')).toHaveClass('bg-forest');
    expect(screen.getByText('elegidos con cariño')).toHaveClass('text-sunlight');

    const articles = container.querySelectorAll('article');
    expect(articles).toHaveLength(3);
    articles.forEach((article, index) => {
      expect(article).toHaveClass('card-surface');
      const cover = article.querySelector('.cover-spine');
      expect(cover).toHaveClass('w-[92px]', 'h-[136px]');
      const dedicationBox = within(article as HTMLElement).getByText('Dedicatoria sugerida').parentElement;
      expect(dedicationBox).toHaveClass('bg-warm-cream');
      expect(within(article as HTMLElement).getByText(`Dedicatoria ${index + 1}`)).toBeInTheDocument();
    });
    screen.getAllByRole('link', { name: 'Comprar' }).forEach((link) => expect(link).toHaveClass('bg-terracotta'));
    expect(screen.queryByText(/Precio de referencia/)).toBeNull();
    expect(screen.queryByText(/Compartir en historias/)).toBeNull();
  });
});
