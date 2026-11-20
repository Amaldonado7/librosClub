import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookCoverCard from '../BookCoverCard';

describe('BookCoverCard', () => {
  it('renderiza la portada con CoverArt dentro del marco lomo', () => {
    render(<BookCoverCard title="Rayuela" subtitle="Julio Cortázar" thumbnail="https://example.com/r.jpg" />);
    const img = screen.getByRole('img', { name: 'Rayuela' });
    expect(img.closest('.cover-spine')).not.toBeNull();
  });

  it('link http(s) renderiza "Ver más" con target y rel seguros', () => {
    render(<BookCoverCard title="Rayuela" link="https://books.google.com/x" />);
    const link = screen.getByRole('link', { name: /ver más/i });
    expect(link).toHaveAttribute('href', 'https://books.google.com/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('link con esquema javascript no se renderiza', () => {
    render(<BookCoverCard title="Rayuela" link="javascript:alert(1)" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('badge accent usa pill-sun', () => {
    render(<BookCoverCard title="Rayuela" badge="2024" badgeVariant="accent" />);
    expect(screen.getByText('2024')).toHaveClass('pill', 'pill-sun');
  });
});
