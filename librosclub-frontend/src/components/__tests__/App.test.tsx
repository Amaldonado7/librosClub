import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('App', () => {
  it('monta la landing dentro de los providers con movimiento reducido configurado', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Tu comunidad de lectores' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'LibrosClub' })).toBeInTheDocument();
  });

  it('/regalo muestra el inicio del test sin redirigir ni abrir el modal', async () => {
    window.history.pushState({}, '', '/regalo');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'El libro justo para cada persona' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/regalo');
    expect(screen.queryByRole('dialog')).toBeNull();
    window.history.pushState({}, '', '/');
  });
});
