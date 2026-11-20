import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';

describe('Toaster re-estilado', () => {
  it('muestra el toast por defecto sobre superficie crema con cierre accesible', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Libro agregado', description: '"Rayuela" fue agregado al catálogo.' });
    });

    const title = screen.getByText('Libro agregado');
    expect(title).toHaveClass('label-mono');
    expect(screen.getByText('"Rayuela" fue agregado al catálogo.')).toHaveClass('font-serif');
    const root = title.closest('li') as HTMLElement;
    expect(root).toHaveClass('bg-surface', 'border-line');

    const close = root.querySelector('button[toast-close]') as HTMLElement;
    expect(close).toHaveClass('h-11', 'w-11');
    fireEvent.click(close);
  });

  it('el toast destructivo usa el color destructive', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Error', description: 'Credenciales inválidas', variant: 'destructive' });
    });
    expect(screen.getByText('Error').closest('li')).toHaveClass('bg-destructive');
  });
});
