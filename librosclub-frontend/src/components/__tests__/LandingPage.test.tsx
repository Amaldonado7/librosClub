import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '../LandingPage';

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
    isPremium: false,
    username: null as string | null,
    token: null as string | null,
    login: () => {},
    logout: () => {},
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../../utils/api', () => ({
  authAPI: { login: () => Promise.resolve({ token: 't' }), register: () => Promise.resolve({ token: 't' }) },
}));

const renderLanding = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<p>Plataforma</p>} />
      </Routes>
    </MemoryRouter>,
  );

const setAuth = (overrides: Partial<typeof mocks.auth>) => Object.assign(mocks.auth, overrides);

describe('LandingPage', () => {
  beforeEach(() => {
    setAuth({ isAuthenticated: false, isPremium: false, username: null, token: null });
  });

  it('renderiza las secciones con su copy actual', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'Tu comunidad de lectores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Todo lo que encontrás' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Planes' })).toBeInTheDocument();
  });

  it('tiene un único sello emblema accesible y stickers decorativos', () => {
    const { container } = renderLanding();
    expect(container.querySelectorAll('svg[role="img"][aria-label="LibrosClub"]')).toHaveLength(1);
    expect(screen.getByText('Olor a libro nuevo')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Compro, apilo, algún día leo')).toHaveAttribute('aria-hidden', 'true');
  });

  it('no agrega links de navegación nuevos', () => {
    renderLanding();
    expect(screen.queryByRole('link', { name: /funciones/i })).toBeNull();
    expect(screen.queryByText('Funciones')).toBeNull();
  });

  it('anónimo: "Iniciá sesión" abre el modo login y "Crear cuenta gratis" el de registro', async () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciá sesión' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta gratis' }));
    expect(await screen.findByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('anónimo: los botones de planes piden cuenta', async () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciá sesión para activar' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Registrate' }));
    expect(await screen.findByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('el CTA principal navega a la plataforma', () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: /Explorar la plataforma/ }));
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
  });

  it('autenticado sin premium: saluda y ofrece activar Premium', () => {
    setAuth({ isAuthenticated: true, username: 'ana', token: 'tok' });
    renderLanding();
    expect(screen.getByText('ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear cuenta gratis' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Activar Premium/ }));
    expect(screen.getByRole('heading', { name: 'Activar Premium' })).toBeInTheDocument();
  });

  it('premium: muestra la pastilla y lleva a la plataforma', () => {
    setAuth({ isAuthenticated: true, isPremium: true, username: 'ana', token: 'tok' });
    renderLanding();
    expect(screen.getByText('Ya sos Premium').closest('.pill')).toHaveClass('pill-sun');
    const buttons = screen.getAllByRole('button', { name: 'Ir a la plataforma' });
    expect(buttons.length).toBeGreaterThan(1);
    fireEvent.click(buttons[buttons.length - 1]);
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
  });

  it('el sticker Premium del plan es informativo', () => {
    renderLanding();
    const sticker = screen.getAllByText('Premium').find((el) => el.classList.contains('pill'));
    expect(sticker).toBeDefined();
    expect(sticker).not.toHaveAttribute('aria-hidden');
  });
});
