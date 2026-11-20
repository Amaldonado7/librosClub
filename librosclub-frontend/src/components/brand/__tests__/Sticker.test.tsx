import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sticker from '../Sticker';

describe('Sticker', () => {
  it('por defecto es decorativo', () => {
    render(<Sticker>Olor a libro nuevo</Sticker>);
    expect(screen.getByText('Olor a libro nuevo')).toHaveAttribute('aria-hidden', 'true');
  });

  it('clampa la rotación a ±8 grados', () => {
    const { rerender } = render(<Sticker rotate={20}>Hola</Sticker>);
    expect(screen.getByText('Hola').style.transform).toBe('rotate(8deg)');
    rerender(<Sticker rotate={-20}>Hola</Sticker>);
    expect(screen.getByText('Hola').style.transform).toBe('rotate(-8deg)');
  });

  it('usa tipografía mono en mayúsculas', () => {
    render(<Sticker>Premium</Sticker>);
    expect(screen.getByText('Premium')).toHaveClass('font-mono', 'uppercase');
  });

  it('decorative false no oculta el contenido', () => {
    render(<Sticker decorative={false}>Premium</Sticker>);
    expect(screen.getByText('Premium')).not.toHaveAttribute('aria-hidden');
  });
});
