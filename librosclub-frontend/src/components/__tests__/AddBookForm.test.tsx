import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddBookForm from '../AddBookForm';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  createBook: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  booksAPI: { createBook: mocks.createBook },
}));

const fill = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

describe('AddBookForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('la vista previa usa CoverArt y se actualiza con título y autor', () => {
    const { container } = render(<AddBookForm token="tok" onBookAdded={vi.fn()} />);
    expect(container.querySelector('.cover-spine')).not.toBeNull();
    expect(screen.getByText('Portada')).toBeInTheDocument();

    fill('Título del libro', 'Rayuela');
    fill('Nombre del autor', 'Julio Cortázar');
    expect(screen.getByText('Rayuela')).toBeInTheDocument();
    expect(screen.getByText('Julio Cortázar')).toBeInTheDocument();

    fill('https://books.google.com/...', 'https://example.com/r.jpg');
    const img = screen.getByRole('img', { name: 'Rayuela' });
    expect(img).toHaveAttribute('src', 'https://example.com/r.jpg');
    fireEvent.error(img);
    expect(screen.queryByRole('img', { name: 'Rayuela' })).toBeNull();
  });

  it('exige título y autor', () => {
    render(<AddBookForm token="tok" onBookAdded={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar libro' }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Campos requeridos', variant: 'destructive' }));
    expect(mocks.createBook).not.toHaveBeenCalled();
  });

  it('envía el libro, avisa y limpia el formulario', async () => {
    mocks.createBook.mockResolvedValue({});
    const onBookAdded = vi.fn();
    render(<AddBookForm token="tok" onBookAdded={onBookAdded} />);

    fill('Título del libro', 'Rayuela');
    fill('Nombre del autor', 'Julio Cortázar');
    fill('Ficción, Romance...', 'Novela');
    fill('Ej: Excelente estado, sin subrayados. Busco algo de ciencia ficción a cambio.', 'Como nuevo');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar libro' }));

    await waitFor(() => expect(onBookAdded).toHaveBeenCalled());
    expect(mocks.createBook).toHaveBeenCalledWith('tok', {
      title: 'Rayuela',
      author: 'Julio Cortázar',
      genre: 'Novela',
      coverUrl: undefined,
      type: 'intercambio',
      description: 'Como nuevo',
    });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Libro agregado' }));
    expect(screen.getByPlaceholderText('Título del libro')).toHaveValue('');
  });

  it('un error de la API muestra toast destructivo', async () => {
    mocks.createBook.mockRejectedValue(new Error('Duplicado'));
    render(<AddBookForm token="tok" onBookAdded={vi.fn()} />);
    fill('Título del libro', 'Rayuela');
    fill('Nombre del autor', 'Julio Cortázar');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar libro' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: 'Duplicado' })),
    );
  });
});
