import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../NotFound';

describe('NotFound', () => {
  it('muestra el 404 con sello decorativo y link de vuelta como botón outline', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <MemoryRouter initialEntries={['/no-existe']}>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '404' })).toHaveClass('font-serif');
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    const link = screen.getByRole('link', { name: 'Return to Home' });
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveClass('rounded-btn');
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('404'), '/no-existe');
    consoleError.mockRestore();
  });
});
