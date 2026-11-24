import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GiftResult from '../GiftResult';
import type { GiftResponse } from '@/lib/gift-contract';

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
    isPremium: false,
    username: null as string | null,
    token: null as string | null,
    plan: null,
    login: () => {},
    logout: () => {},
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/utils/api', () => ({
  authAPI: { login: vi.fn(), register: vi.fn() },
}));

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

const renderResult = (onRestart = vi.fn()) =>
  render(
    <MemoryRouter>
      <GiftResult result={RESULT} onRestart={onRestart} />
    </MemoryRouter>,
  );

describe('GiftResult', () => {
  beforeEach(() => {
    mocks.auth.isAuthenticated = false;
  });

  it('muestra encabezado, título enfocado y leyenda', () => {
    renderResult();
    expect(screen.getByText('PARA MAMÁ · NAVIDAD')).toHaveClass('label-mono');
    const title = screen.getByRole('heading', { level: 1, name: 'Tres libros para tu mamá' });
    expect(document.activeElement).toBe(title);
    expect(screen.getByText('elegidos con cariño')).toHaveClass('accent-hand');
  });

  it('lista los 3 libros en orden con todos sus datos y sin shareQuote', () => {
    renderResult();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    items.forEach((item, index) => {
      const n = index + 1;
      const scoped = within(item);
      expect(scoped.getByRole('heading', { level: 3, name: `Libro ${n}` })).toBeInTheDocument();
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
    expect(button).toHaveClass('h-14');
    fireEvent.click(button);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('sin sesión, Registrarme abre el modal en modo registro', () => {
    renderResult();
    expect(screen.getByRole('heading', { name: 'Sumate a LibrosClub' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('con sesión, muestra Ir a LibrosClub hacia /app y no Registrarme', () => {
    mocks.auth.isAuthenticated = true;
    renderResult();
    expect(screen.queryByRole('button', { name: 'Registrarme' })).toBeNull();
    const link = screen.getByRole('link', { name: 'Ir a LibrosClub' });
    expect(link).toHaveAttribute('href', '/app');
    expect(link).toHaveClass('min-h-11');
  });
});
