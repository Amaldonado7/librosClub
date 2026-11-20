import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverArt from '../CoverArt';
import { coverPaletteFor } from '@/lib/cover-palette';

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

describe('CoverArt', () => {
  it('con src renderiza la imagen dentro del marco lomo', () => {
    render(<CoverArt src="https://example.com/cover.jpg" title="Rayuela" />);
    const img = screen.getByRole('img', { name: 'Rayuela' });
    expect(img.tagName).toBe('IMG');
    expect(img.closest('.cover-spine')).not.toBeNull();
  });

  it('si la imagen falla muestra el fallback de paleta con título y subtítulo', () => {
    const { container } = render(
      <CoverArt src="https://example.com/broken.jpg" title="Rayuela" subtitle="Julio Cortázar" />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'Rayuela' }));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Rayuela')).toBeInTheDocument();
    expect(screen.getByText('Julio Cortázar')).toBeInTheDocument();

    const fallback = screen.getByText('Rayuela').parentElement as HTMLElement;
    expect(fallback.style.backgroundColor).toBe(hexToRgb(coverPaletteFor('Rayuela').bg));
  });

  it('sin src muestra el fallback directamente', () => {
    const { container } = render(<CoverArt title="Ficciones" subtitle="Borges" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Ficciones')).toBeInTheDocument();
  });

  it('thumb sin src expone el título como nombre accesible', () => {
    render(<CoverArt title="El Aleph" size="thumb" />);
    const thumb = screen.getByRole('img', { name: 'El Aleph' });
    expect(thumb).toHaveClass('cover-spine');
  });

  it('al cambiar src después de un error vuelve a mostrar la imagen', () => {
    const { rerender, container } = render(<CoverArt src="https://example.com/a.jpg" title="Rayuela" />);
    fireEvent.error(screen.getByRole('img', { name: 'Rayuela' }));
    expect(container.querySelector('img')).toBeNull();

    rerender(<CoverArt src="https://example.com/b.jpg" title="Rayuela" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/b.jpg');
  });
});
