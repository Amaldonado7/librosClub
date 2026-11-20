import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookAdminRow from '../BookAdminRow';
import type { Book } from '../../utils/api';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  booksAPI: { updateBook: mocks.updateBook, deleteBook: mocks.deleteBook },
}));

const book: Book = {
  id: 'b1',
  title: 'Rayuela',
  author: 'Julio Cortázar',
  genre: 'Novela',
  type: 'intercambio',
  description: 'Buen estado',
};

const renderRow = (overrides: Partial<Book> = {}) => {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  const { container } = render(
    <BookAdminRow book={{ ...book, ...overrides }} token="tok" onUpdated={onUpdated} onDeleted={onDeleted} />,
  );
  return { onUpdated, onDeleted, row: container.firstElementChild as HTMLElement };
};

describe('BookAdminRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('estado normal: miniatura, datos y acciones con nombre accesible', () => {
    const { row } = renderRow();
    expect(screen.getByRole('img', { name: 'Rayuela' })).toHaveClass('cover-spine');
    expect(screen.getByText('Para intercambio')).toHaveClass('pill-sun');
    expect(screen.getByText('Novela')).toBeInTheDocument();
    expect(screen.getByText('"Buen estado"')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    expect(row).toHaveClass('bg-surface');
  });

  it('libro en venta usa la pastilla forest', () => {
    renderRow({ type: 'venta' });
    expect(screen.getByText('En venta')).toHaveClass('pill-forest');
  });

  it('editando: guarda los cambios y vuelve al estado normal', async () => {
    mocks.updateBook.mockResolvedValue({ ...book, title: 'Rayuela (ed. 2)' });
    const { onUpdated, row } = renderRow();

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(row).toHaveClass('bg-warm-cream');
    fireEvent.change(screen.getByRole('textbox', { name: 'Título' }), { target: { value: 'Rayuela (ed. 2)' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'URL de portada (opcional)' }), {
      target: { value: 'https://example.com/r.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(mocks.updateBook).toHaveBeenCalledWith('tok', 'b1', expect.objectContaining({
        title: 'Rayuela (ed. 2)',
        coverUrl: 'https://example.com/r.jpg',
      })),
    );
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rayuela (ed. 2)' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull());
  });

  it('editando: valida campos requeridos y permite cancelar', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Título' }), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Campos requeridos', variant: 'destructive' }));
    expect(mocks.updateBook).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('editando: un error de la API muestra un toast destructivo', async () => {
    mocks.updateBook.mockRejectedValue(new Error('No se pudo guardar'));
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'No se pudo guardar' }),
      ),
    );
  });

  it('confirmando borrado: elimina al confirmar', async () => {
    mocks.deleteBook.mockResolvedValue(undefined);
    const { onDeleted, row } = renderRow();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(row).toHaveClass('border-destructive');
    expect(screen.getByText('¿Eliminar?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('b1'));
    expect(mocks.deleteBook).toHaveBeenCalledWith('tok', 'b1');
  });

  it('confirmando borrado: "No" vuelve al estado normal', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('confirmando borrado: un error muestra toast y sale de la confirmación', async () => {
    mocks.deleteBook.mockRejectedValue(new Error('En uso'));
    const { onDeleted } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: 'En uso' })),
    );
    expect(onDeleted).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument());
  });
});
