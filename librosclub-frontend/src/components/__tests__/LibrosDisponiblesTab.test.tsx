import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LibrosDisponiblesTab from '../LibrosDisponiblesTab';
import type { Book, BookRequest } from '../../utils/api';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  request: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  bookRequestsAPI: { request: mocks.request },
}));

const books: Book[] = [
  { id: '1', title: 'Rayuela', author: 'Cortázar', type: 'intercambio' },
  { id: '2', title: 'Ficciones', author: 'Borges', type: 'venta' },
  { id: '3', title: 'El Aleph', author: 'Borges', type: 'venta' },
  { id: '4', title: 'Zama', author: 'Di Benedetto', type: 'venta' },
];

type Props = React.ComponentProps<typeof LibrosDisponiblesTab>;

const renderTab = (props: Partial<Props> = {}) => {
  const defaults: Props = {
    token: 'tok',
    allBooks: books,
    isLoadingBooks: false,
    isAdmin: false,
    onGoToAdmin: vi.fn(),
    myRequests: new Map(),
    onRequested: vi.fn(),
    onAuthRequired: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  const utils = render(<LibrosDisponiblesTab {...merged} />);
  return { ...utils, props: merged };
};

describe('LibrosDisponiblesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el skeleton mientras carga', () => {
    const { container } = renderTab({ isLoadingBooks: true });
    expect(container.querySelector('.cover-grid[aria-hidden="true"]')).not.toBeNull();
  });

  it('sin libros muestra el estado vacío', () => {
    renderTab({ allBooks: [] });
    expect(screen.getByText('No se encontraron libros')).toBeInTheDocument();
  });

  it('renderiza la grilla de portadas y los estados de solicitud', () => {
    const myRequests = new Map<number, BookRequest['status']>([
      [2, 'pending'],
      [3, 'accepted'],
      [4, 'rejected'],
    ]);
    const { container } = renderTab({ myRequests });
    expect(container.querySelector('.cover-grid')?.children).toHaveLength(4);
    expect(screen.getByText('Pendiente').closest('.pill')).toHaveClass('pill-sun');
    expect(screen.getByText('Aceptado').closest('.pill')).toHaveClass('pill-forest');
    expect(screen.getByText('Rechazado').closest('.pill')).toHaveClass('pill-outline', 'text-destructive');
    expect(screen.getAllByRole('button', { name: /Solicitar/ })).toHaveLength(1);
  });

  it('solicitar un libro notifica y avisa con toast', async () => {
    const req = { id: 9, bookId: 1, type: 'intercambio', status: 'pending', createdAt: '' };
    mocks.request.mockResolvedValue(req);
    const { props } = renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: /Solicitar/ })[0]);
    await waitFor(() => expect(props.onRequested).toHaveBeenCalledWith(req));
    expect(mocks.request).toHaveBeenCalledWith('tok', '1');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Solicitud de intercambio enviada' }));
  });

  it('solicitar una compra usa el texto de compra', async () => {
    mocks.request.mockResolvedValue({ id: 10, bookId: 2 });
    renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: /Solicitar/ })[1]);
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Solicitud de compra enviada' })),
    );
  });

  it('un error al solicitar muestra toast destructivo', async () => {
    mocks.request.mockRejectedValue(new Error('Ya lo pediste'));
    renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: /Solicitar/ })[0]);
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: 'Ya lo pediste' })),
    );
  });

  it('sin sesión pide autenticarse', () => {
    const { props } = renderTab({ token: null });
    fireEvent.click(screen.getAllByRole('button', { name: /Solicitar/ })[0]);
    expect(props.onAuthRequired).toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('el admin ve el banner de gestión y no los botones de solicitud', () => {
    const { props } = renderTab({ isAdmin: true });
    expect(screen.queryByRole('button', { name: /Solicitar/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Gestionar catálogo/ }));
    expect(props.onGoToAdmin).toHaveBeenCalled();
  });
});
