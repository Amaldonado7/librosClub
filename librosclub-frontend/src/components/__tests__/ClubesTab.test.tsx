import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ClubesTab from '../ClubesTab';
import type { Club } from '../../utils/api';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  clubsAPI: {
    getClubs: vi.fn(),
    createClub: vi.fn(),
    joinClub: vi.fn(),
    leaveClub: vi.fn(),
    getClubDetail: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  clubsAPI: mocks.clubsAPI,
  ApiError: class extends Error {},
}));

const makeClub = (overrides: Partial<Club>): Club => ({
  id: 1,
  nombre: 'Club',
  creadorId: 1,
  creadorUsername: 'ana',
  fechaCreacion: '2026-01-01',
  miembros: 1,
  miRol: null,
  ...overrides,
});

const clubs: Club[] = [
  makeClub({ id: 1, nombre: 'Club Abierto', descripcion: 'Para todos', ubicacion: 'Palermo', miembros: 1 }),
  makeClub({ id: 2, nombre: 'Club Miembro', miRol: 'miembro', miembros: 4, currentBookTitle: 'Rayuela', plan: 'premium' }),
  makeClub({ id: 3, nombre: 'Club Propio', miRol: 'admin', miembros: 2 }),
];

type Props = React.ComponentProps<typeof ClubesTab>;

const renderTab = (props: Partial<Props> = {}) => {
  const merged: Props = { token: 'tok', isAdmin: false, userId: 1, onAuthRequired: vi.fn(), ...props };
  render(<ClubesTab {...merged} />);
  return merged;
};

const card = (name: string) => screen.getByText(name).closest('.card-surface') as HTMLElement;

describe('ClubesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clubsAPI.getClubs.mockResolvedValue(clubs);
    mocks.clubsAPI.getClubDetail.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lista los clubes con pastillas de rol y plan', async () => {
    renderTab();
    expect(await screen.findByText('Club Abierto')).toBeInTheDocument();
    expect(within(card('Club Miembro')).getByText('Premium')).toHaveClass('pill-sun');
    expect(within(card('Club Miembro')).getByText('Miembro')).toHaveClass('pill-forest');
    expect(within(card('Club Propio')).getByText('Sos el creador')).toBeInTheDocument();
    expect(within(card('Club Abierto')).getByText('1 miembro')).toBeInTheDocument();
    expect(within(card('Club Miembro')).getByText('Rayuela')).toBeInTheDocument();
  });

  it('sin clubes muestra el estado vacío', async () => {
    mocks.clubsAPI.getClubs.mockResolvedValue([]);
    renderTab();
    expect(await screen.findByText('No hay clubes todavía')).toBeInTheDocument();
  });

  it('si falla la carga muestra toast destructivo', async () => {
    mocks.clubsAPI.getClubs.mockRejectedValue(new Error('x'));
    renderTab();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'No se pudieron cargar los clubes.', variant: 'destructive' }),
      ),
    );
  });

  it('unirse y salir actualizan el contador de miembros', async () => {
    mocks.clubsAPI.joinClub.mockResolvedValue(undefined);
    mocks.clubsAPI.leaveClub.mockResolvedValue(undefined);
    renderTab();
    await screen.findByText('Club Abierto');

    fireEvent.click(within(card('Club Abierto')).getByRole('button', { name: /Unirse/ }));
    await waitFor(() => expect(within(card('Club Abierto')).getByText('2 miembros')).toBeInTheDocument());
    expect(mocks.clubsAPI.joinClub).toHaveBeenCalledWith('tok', 1);

    fireEvent.click(within(card('Club Miembro')).getByRole('button', { name: 'Salir' }));
    await waitFor(() => expect(within(card('Club Miembro')).getByText('3 miembros')).toBeInTheDocument());
  });

  it('errores al unirse o salir muestran toast destructivo', async () => {
    mocks.clubsAPI.joinClub.mockRejectedValue(new Error('Club lleno'));
    mocks.clubsAPI.leaveClub.mockRejectedValue(new Error('No podés salir'));
    renderTab();
    await screen.findByText('Club Abierto');
    fireEvent.click(within(card('Club Abierto')).getByRole('button', { name: /Unirse/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Club lleno' })));
    fireEvent.click(within(card('Club Miembro')).getByRole('button', { name: 'Salir' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'No podés salir' })));
  });

  it('sin sesión unirse pide autenticación', async () => {
    const props = renderTab({ token: null });
    await screen.findByText('Club Abierto');
    fireEvent.click(within(card('Club Abierto')).getByRole('button', { name: /Unirse/ }));
    expect(props.onAuthRequired).toHaveBeenCalled();
  });

  it('al hacer click en un club propio abre el detalle', async () => {
    renderTab();
    await screen.findByText('Club Propio');
    fireEvent.click(card('Club Propio'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('el admin crea un club geocodificando la ubicación', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve([{ lat: '-34.6', lon: '-58.4', display_name: 'Palermo, CABA, Argentina' }]),
      }),
    );
    mocks.clubsAPI.createClub.mockResolvedValue(makeClub({ id: 9, nombre: 'Club Nuevo' }));
    renderTab({ isAdmin: true });
    await screen.findByText('Club Abierto');

    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo club/ }));
    await screen.findByPlaceholderText('Ej: Club Fantástico Palermo');
    fireEvent.change(screen.getByPlaceholderText('Ej: Club Fantástico Palermo'), { target: { value: 'Club Nuevo' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Palermo, CABA'), { target: { value: 'Palermo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ubicar en mapa' }));
    expect(await screen.findByText(/Coordenadas guardadas/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Crear club' }));
    await waitFor(() =>
      expect(mocks.clubsAPI.createClub).toHaveBeenCalledWith('tok', expect.objectContaining({
        nombre: 'Club Nuevo',
        ubicacion: 'Palermo',
        lat: -34.6,
        lng: -58.4,
      })),
    );
    expect(await screen.findByText('Club Nuevo')).toBeInTheDocument();
  });

  it('crear club geocodifica al enviar si no se ubicó antes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([{ lat: '1', lon: '2' }]) }));
    mocks.clubsAPI.createClub.mockResolvedValue(makeClub({ id: 10, nombre: 'Club B' }));
    renderTab({ isAdmin: true });
    await screen.findByText('Club Abierto');
    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo club/ }));
    await screen.findByPlaceholderText('Ej: Club Fantástico Palermo');
    fireEvent.change(screen.getByPlaceholderText('Ej: Club Fantástico Palermo'), { target: { value: 'Club B' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Palermo, CABA'), { target: { value: 'Belgrano' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear club' }));
    await waitFor(() =>
      expect(mocks.clubsAPI.createClub).toHaveBeenCalledWith('tok', expect.objectContaining({ lat: 1, lng: 2 })),
    );
  });

  it('crear club valida nombre, maneja errores de geocodificación y de la API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve([]) })
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    mocks.clubsAPI.createClub.mockRejectedValue(new Error('Nombre repetido'));
    renderTab({ isAdmin: true });
    await screen.findByText('Club Abierto');
    fireEvent.click(screen.getByRole('button', { name: /Crear nuevo club/ }));
    await screen.findByPlaceholderText('Ej: Club Fantástico Palermo');

    fireEvent.click(screen.getByRole('button', { name: 'Crear club' }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nombre requerido' }));

    fireEvent.change(screen.getByPlaceholderText('Ej: Palermo, CABA'), { target: { value: 'Ningún lado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ubicar en mapa' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No se encontró la ubicación' })),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ubicar en mapa' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error al geocodificar' })));

    fireEvent.change(screen.getByPlaceholderText('Ej: Club Fantástico Palermo'), { target: { value: 'Club X' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Palermo, CABA'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear club' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Nombre repetido' })));

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(await screen.findByRole('button', { name: /Crear nuevo club/ })).toBeInTheDocument();
  });
});
