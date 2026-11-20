import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestChatModal from '../RequestChatModal';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  bookRequestsAPI: { getMessages: mocks.getMessages, sendMessage: mocks.sendMessage },
}));

const message = (id: number, senderId: number, text: string) => ({
  id,
  requestId: 5,
  senderId,
  senderUsername: senderId === 1 ? 'ana' : 'beto',
  message: text,
  createdAt: '2026-11-19T15:30:00Z',
});

const renderModal = (props: Partial<React.ComponentProps<typeof RequestChatModal>> = {}) => {
  const onClose = vi.fn();
  render(
    <RequestChatModal
      requestId={5}
      token="tok"
      currentUserId={1}
      bookTitle="Rayuela"
      onClose={onClose}
      {...props}
    />,
  );
  return { onClose };
};

describe('RequestChatModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('muestra los mensajes propios y ajenos con estilos distintos', async () => {
    mocks.getMessages.mockResolvedValue([message(1, 1, 'Hola!'), message(2, 2, '¿Cuándo nos vemos?')]);
    renderModal({ requesterUsername: 'beto' });
    expect(await screen.findByText('Hola!')).toHaveClass('bg-forest');
    expect(screen.getByText('¿Cuándo nos vemos?')).toHaveClass('bg-warm-cream');
    expect(screen.getByText('Rayuela · con beto')).toBeInTheDocument();
    expect(mocks.getMessages).toHaveBeenCalledWith('tok', 5);
  });

  it('sin mensajes muestra el estado vacío y tolera fallos del poll', async () => {
    mocks.getMessages.mockRejectedValue(new Error('offline'));
    renderModal();
    expect(
      await screen.findByText('Ningún mensaje todavía. ¡Empezá la conversación para coordinar el intercambio!'),
    ).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('envía un mensaje y lo agrega a la conversación', async () => {
    mocks.getMessages.mockResolvedValue([]);
    mocks.sendMessage.mockResolvedValue(message(3, 1, 'Te escribo'));
    renderModal();

    const send = screen.getByRole('button', { name: 'Enviar' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Escribí un mensaje...' }), { target: { value: ' Te escribo ' } });
    fireEvent.click(send);

    expect(await screen.findByText('Te escribo')).toBeInTheDocument();
    expect(mocks.sendMessage).toHaveBeenCalledWith('tok', 5, 'Te escribo');
    expect(screen.getByRole('textbox', { name: 'Escribí un mensaje...' })).toHaveValue('');
  });

  it('un error al enviar muestra toast destructivo', async () => {
    mocks.getMessages.mockResolvedValue([]);
    mocks.sendMessage.mockRejectedValue(new Error('Solicitud cerrada'));
    renderModal();
    fireEvent.change(screen.getByRole('textbox', { name: 'Escribí un mensaje...' }), { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'Solicitud cerrada' }),
      ),
    );
  });

  it('el botón Cerrar tiene nombre accesible y cierra', () => {
    mocks.getMessages.mockResolvedValue([]);
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
