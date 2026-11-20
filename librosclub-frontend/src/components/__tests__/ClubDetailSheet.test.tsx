import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ClubDetailSheet from '../ClubDetailSheet';
import type { Club, ClubDetail } from '../../utils/api';

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    ApiError,
    toast: vi.fn(),
    clubsAPI: {
      getClubDetail: vi.fn(),
      upgradeClub: vi.fn(),
      setCurrentBook: vi.fn(),
      addMeeting: vi.fn(),
      deleteMeeting: vi.fn(),
      setClubLocation: vi.fn(),
      createPost: vi.fn(),
      deletePost: vi.fn(),
    },
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  ApiError: mocks.ApiError,
  clubsAPI: mocks.clubsAPI,
}));

const club: Club = {
  id: 7,
  nombre: 'Club Palermo',
  descripcion: 'Leemos fantasía',
  ubicacion: 'Palermo, CABA',
  lat: null,
  lng: null,
  creadorId: 1,
  creadorUsername: 'ana',
  fechaCreacion: '2026-01-01T00:00:00Z',
  miembros: 3,
  miRol: 'admin',
  plan: 'premium',
};

const premiumDetail = (overrides: Partial<ClubDetail> = {}): ClubDetail => ({
  ...club,
  currentBookTitle: 'Rayuela',
  currentBookAuthor: 'Julio Cortázar',
  currentBookCoverUrl: null,
  meetings: [
    {
      id: 1,
      clubId: 7,
      titulo: 'Encuentro mensual',
      descripcion: 'Capítulos 1 a 5',
      fecha: '2026-12-01T19:00:00Z',
      ubicacion: 'Café La Paloma',
      createdAt: '2026-11-01T00:00:00Z',
    },
  ],
  posts: [
    { id: 11, clubId: 7, autorId: 1, autorUsername: 'ana', contenido: 'Hola club', createdAt: new Date().toISOString() },
  ],
  ...overrides,
});

const renderSheet = (props: Partial<React.ComponentProps<typeof ClubDetailSheet>> = {}) => {
  const onClubUpdated = vi.fn();
  const onClose = vi.fn();
  render(
    <ClubDetailSheet
      club={club}
      token="tok"
      userId={1}
      onClose={onClose}
      onClubUpdated={onClubUpdated}
      {...props}
    />,
  );
  return { onClubUpdated, onClose };
};

describe('ClubDetailSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el detalle premium con libro, reuniones y foro', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    renderSheet();
    expect(await screen.findByText('Rayuela')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Club Palermo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rayuela' })).toHaveClass('cover-spine');
    expect(screen.getByText('Encuentro mensual')).toBeInTheDocument();
    expect(screen.getByText('Hola club')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toHaveClass('pill-sun');
  });

  it('si falla la carga muestra el error y un toast destructivo', async () => {
    mocks.clubsAPI.getClubDetail.mockRejectedValue(new Error('Sin conexión'));
    renderSheet();
    expect(await screen.findByText('No se pudo cargar el detalle.')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Sin conexión' }),
    );
  });

  it('plan gratis muestra el banner premium y permite actualizar', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail({ plan: 'free' }));
    mocks.clubsAPI.upgradeClub.mockResolvedValue({ plan: 'premium', planExpiresAt: '2027-01-01' });
    const { onClubUpdated } = renderSheet({ club: { ...club, plan: 'free' } });

    fireEvent.click(await screen.findByRole('button', { name: /Activar Premium \(demo\)/ }));
    await waitFor(() => expect(mocks.clubsAPI.upgradeClub).toHaveBeenCalledWith('tok', 7));
    expect(onClubUpdated).toHaveBeenCalledWith(expect.objectContaining({ plan: 'premium' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Activar Premium \(demo\)/ })).toBeNull());
    expect(screen.queryByText('Disponible en plan Premium.')).toBeNull();
  });

  it('upgrade fallido dispara un toast destructivo', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail({ plan: 'free' }));
    mocks.clubsAPI.upgradeClub.mockRejectedValue(new Error('Pago rechazado'));
    renderSheet({ club: { ...club, plan: 'free' } });
    fireEvent.click(await screen.findByRole('button', { name: /Activar Premium \(demo\)/ }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'Pago rechazado' }),
      ),
    );
  });

  it('el admin cambia el libro actual', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.setCurrentBook.mockResolvedValue(undefined);
    const { onClubUpdated } = renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar' }));
    fireEvent.change(screen.getByPlaceholderText('Ej: El nombre del viento'), { target: { value: 'Ficciones' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Patrick Rothfuss'), { target: { value: 'Borges' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(mocks.clubsAPI.setCurrentBook).toHaveBeenCalledWith('tok', 7, {
        title: 'Ficciones',
        author: 'Borges',
        coverUrl: null,
      }),
    );
    expect(await screen.findByText('Ficciones')).toBeInTheDocument();
    expect(onClubUpdated).toHaveBeenCalledWith(expect.objectContaining({ currentBookTitle: 'Ficciones' }));
  });

  it('guardar libro sin premium informa el requisito', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.setCurrentBook.mockRejectedValue(new mocks.ApiError('Necesitás Premium', 'PREMIUM_REQUIRED'));
    renderSheet();
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Plan Premium requerido', variant: 'destructive' }),
      ),
    );
  });

  it('guardar libro con error genérico muestra toast de error', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.setCurrentBook.mockRejectedValue(new Error('Falla'));
    renderSheet();
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error', description: 'Falla' })),
    );
  });

  it('el admin quita el libro actual y puede cancelar la edición', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.setCurrentBook.mockResolvedValue(undefined);
    renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByPlaceholderText('Ej: El nombre del viento')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() =>
      expect(mocks.clubsAPI.setCurrentBook).toHaveBeenCalledWith('tok', 7, { title: null, author: null, coverUrl: null }),
    );
  });

  it('quitar libro con error muestra toast destructivo', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.setCurrentBook.mockRejectedValue(new Error('No se pudo quitar'));
    renderSheet();
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'No se pudo quitar' })),
    );
  });

  it('agenda una reunión nueva', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.addMeeting.mockResolvedValue({
      id: 2,
      clubId: 7,
      titulo: 'Cierre de año',
      fecha: '2026-12-20T19:00:00Z',
      createdAt: '2026-11-19T00:00:00Z',
    });
    renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }));
    fireEvent.change(screen.getByPlaceholderText('Ej: Encuentro mensual'), { target: { value: 'Cierre de año' } });
    fireEvent.change(document.querySelector('input[type="datetime-local"]') as HTMLInputElement, {
      target: { value: '2026-12-20T19:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: Café La Paloma, Palermo'), { target: { value: 'Biblioteca' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar reunión' }));

    await waitFor(() =>
      expect(mocks.clubsAPI.addMeeting).toHaveBeenCalledWith(
        'tok',
        7,
        expect.objectContaining({ titulo: 'Cierre de año', fecha: '2026-12-20T19:00', ubicacion: 'Biblioteca' }),
      ),
    );
    expect(await screen.findByText('Cierre de año')).toBeInTheDocument();
  });

  it('agendar sin premium informa el requisito', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.addMeeting.mockRejectedValue(new mocks.ApiError('Premium', 'PREMIUM_REQUIRED'));
    renderSheet();
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }));
    fireEvent.change(screen.getByPlaceholderText('Ej: Encuentro mensual'), { target: { value: 'X' } });
    fireEvent.change(document.querySelector('input[type="datetime-local"]') as HTMLInputElement, {
      target: { value: '2026-12-20T19:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar reunión' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Plan Premium requerido' })),
    );
  });

  it('agendar con error genérico muestra toast de error', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.addMeeting.mockRejectedValue(new Error('Fecha inválida'));
    renderSheet();
    fireEvent.click(await screen.findByRole('button', { name: 'Agendar' }));
    fireEvent.change(screen.getByPlaceholderText('Ej: Encuentro mensual'), { target: { value: 'X' } });
    fireEvent.change(document.querySelector('input[type="datetime-local"]') as HTMLInputElement, {
      target: { value: '2026-12-20T19:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar reunión' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Fecha inválida' })),
    );
  });

  it('elimina reuniones y posts, y reporta errores', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.deleteMeeting.mockResolvedValue(undefined);
    mocks.clubsAPI.deletePost.mockRejectedValue(new Error('No autorizado'));
    renderSheet();

    await screen.findByText('Encuentro mensual');
    const [deleteMeeting, deletePost] = screen.getAllByRole('button', { name: 'Eliminar' });
    fireEvent.click(deleteMeeting);
    await waitFor(() => expect(mocks.clubsAPI.deleteMeeting).toHaveBeenCalledWith('tok', 7, 1));
    await waitFor(() => expect(screen.queryByText('Encuentro mensual')).toBeNull());

    fireEvent.click(deletePost);
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'No autorizado' })),
    );
  });

  it('eliminar reunión con error muestra toast', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.deleteMeeting.mockRejectedValue(new Error('Ups'));
    renderSheet();
    await screen.findByText('Encuentro mensual');
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Ups' })));
  });

  it('publica en el foro con el botón Enviar y con Enter', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.createPost.mockImplementation((_t: string, _id: number, contenido: string) =>
      Promise.resolve({ id: Math.random(), clubId: 7, autorId: 1, autorUsername: 'ana', contenido, createdAt: new Date().toISOString() }),
    );
    mocks.clubsAPI.deletePost.mockResolvedValue(undefined);
    renderSheet();

    const textarea = await screen.findByPlaceholderText('Escribí algo para el club...');
    fireEvent.change(textarea, { target: { value: 'Primer post' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Primer post')).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Segundo post' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(await screen.findByText('Segundo post')).toBeInTheDocument();

    const post = screen.getByText('Hola club').parentElement as HTMLElement;
    fireEvent.click(within(post).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(mocks.clubsAPI.deletePost).toHaveBeenCalledWith('tok', 7, 11));
  });

  it('publicar sin premium o con error muestra toast', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.createPost
      .mockRejectedValueOnce(new mocks.ApiError('Premium', 'PREMIUM_REQUIRED'))
      .mockRejectedValueOnce(new Error('Spam'));
    renderSheet();
    const textarea = await screen.findByPlaceholderText('Escribí algo para el club...');
    fireEvent.change(textarea, { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Plan Premium requerido' })),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Spam' })));
  });

  it('el admin guarda las coordenadas del club', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    mocks.clubsAPI.setClubLocation.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([{ lat: '-34.58', lon: '-58.42' }]) }));
    const { onClubUpdated } = renderSheet();

    const locate = await screen.findByRole('button', { name: "Guardar coordenadas para aparecer en 'Cerca tuyo'" });
    fireEvent.click(locate);
    await waitFor(() =>
      expect(mocks.clubsAPI.setClubLocation).toHaveBeenCalledWith('tok', 7, { lat: -34.58, lng: -58.42 }),
    );
    expect(onClubUpdated).toHaveBeenCalledWith(expect.objectContaining({ lat: -34.58, lng: -58.42 }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: "Guardar coordenadas para aparecer en 'Cerca tuyo'" })).toBeNull(),
    );
  });

  it('coordenadas no encontradas o con error muestran toast', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(premiumDetail());
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve([]) })
      .mockRejectedValueOnce(new Error('Sin red'));
    vi.stubGlobal('fetch', fetchMock);
    renderSheet();

    const locate = await screen.findByRole('button', { name: "Guardar coordenadas para aparecer en 'Cerca tuyo'" });
    fireEvent.click(locate);
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No se encontró la ubicación' })),
    );
    fireEvent.click(locate);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Sin red' })));
  });

  it('un miembro sin libro ni reuniones ve los estados vacíos', async () => {
    mocks.clubsAPI.getClubDetail.mockResolvedValue(
      premiumDetail({ miRol: 'miembro', currentBookTitle: null, meetings: [], posts: [] }),
    );
    renderSheet({ club: { ...club, miRol: 'miembro' }, userId: 2 });
    expect(await screen.findByText('El admin del club no ha elegido un libro todavía.')).toBeInTheDocument();
    expect(screen.getByText('No hay reuniones próximas agendadas.')).toBeInTheDocument();
    expect(screen.getByText('Nadie ha publicado todavía. ¡Sé el primero!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agendar' })).toBeNull();
  });
});
