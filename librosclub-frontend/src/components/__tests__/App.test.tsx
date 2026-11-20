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
});
