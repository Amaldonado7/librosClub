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

  it('con fallbackColor el respaldo usa ese color y texto crema; sin él mantiene la paleta', () => {
    const { unmount } = render(<CoverArt title="Rayuela" fallbackColor="#91551F" />);
    const fallback = screen.getByText('Rayuela').parentElement as HTMLElement;
    expect(fallback.style.backgroundColor).toBe('rgb(145, 85, 31)');
    expect(fallback.style.color).toBe(hexToRgb('#F7F0E2'));
    unmount();

    render(<CoverArt title="Rayuela" />);
    const paletteFallback = screen.getByText('Rayuela').parentElement as HTMLElement;
    expect(paletteFallback.style.backgroundColor).toBe(hexToRgb(coverPaletteFor('Rayuela').bg));
  });

  it('con fallbackColor y la imagen rota el respaldo usa ese color', () => {
    render(<CoverArt src="https://example.com/broken.jpg" title="Rayuela" fallbackColor="#492710" size="thumb" />);
    fireEvent.error(screen.getByRole('img', { name: 'Rayuela' }));
    const thumb = screen.getByRole('img', { name: 'Rayuela' });
    expect((thumb.firstElementChild as HTMLElement).style.backgroundColor).toBe('rgb(73, 39, 16)');
  });

  it('al cambiar src después de un error vuelve a mostrar la imagen', () => {
    const { rerender, container } = render(<CoverArt src="https://example.com/a.jpg" title="Rayuela" />);
    fireEvent.error(screen.getByRole('img', { name: 'Rayuela' }));
    expect(container.querySelector('img')).toBeNull();

    rerender(<CoverArt src="https://example.com/b.jpg" title="Rayuela" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/b.jpg');
  });

  it('compact sin src mide 92 × 136 px y muestra el título con fallbackColor', () => {
    render(<CoverArt size="compact" title="Rayuela" fallbackColor="#91551F" />);
    const title = screen.getByText('Rayuela');
    expect(title).toHaveClass('font-serif', 'text-[13px]', 'line-clamp-5');
    const fallback = title.parentElement as HTMLElement;
    expect(fallback.style.backgroundColor).toBe('rgb(145, 85, 31)');
    expect(fallback.style.color).toBe(hexToRgb('#F7F0E2'));
    expect(fallback.style.padding).toBe('12px 10px');
    const frame = fallback.parentElement as HTMLElement;
    expect(frame).toHaveClass('cover-spine', 'w-[92px]', 'h-[136px]', 'shrink-0');
    expect(frame).not.toHaveAttribute('role');
  });

  it('compact sin fallbackColor usa la paleta del título y no muestra el subtítulo', () => {
    render(<CoverArt size="compact" title="Ficciones" subtitle="Borges" />);
    const fallback = screen.getByText('Ficciones').parentElement as HTMLElement;
    expect(fallback.style.backgroundColor).toBe(hexToRgb(coverPaletteFor('Ficciones').bg));
    expect(screen.queryByText('Borges')).toBeNull();
  });
});
