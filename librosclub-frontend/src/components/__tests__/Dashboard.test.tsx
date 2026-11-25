import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

const mocks = vi.hoisted(() => ({
  auth: { token: null as string | null, logout: vi.fn(), isPremium: false, login: () => {} },
  toast: vi.fn(),
  getGoogleFeed: vi.fn(),
  getMyRequests: vi.fn(),
  getAllBooks: vi.fn(),
  searchGoogleBooks: vi.fn(),
  getAdminRequests: vi.fn(),
  respond: vi.fn(),
  getMessages: vi.fn(),
  getClubs: vi.fn(),
  ApiError: class extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
}));

const RATE_LIMITED_MESSAGE = 'Hiciste muchas búsquedas seguidas. Probá de nuevo en unos minutos.';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  booksAPI: {
    getGoogleFeed: mocks.getGoogleFeed,
    getAllBooks: mocks.getAllBooks,
    searchGoogleBooks: mocks.searchGoogleBooks,
  },
  bookRequestsAPI: {
    getMyRequests: mocks.getMyRequests,
    getAdminRequests: mocks.getAdminRequests,
    respond: mocks.respond,
    getMessages: mocks.getMessages,
    sendMessage: vi.fn(),
    request: vi.fn(),
  },
  authAPI: {},
  clubsAPI: { getClubs: mocks.getClubs },
  ApiError: mocks.ApiError,
}));

const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

const fakeToken = (role: string) =>
  `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ role, userId: 1, username: 'ana' })}.firma`;

const page = (prefix: string, size: number) =>
  Array.from({ length: size }, (_, i) => ({ id: `${prefix}-${i}`, title: `Libro ${prefix} ${i}` }));

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.token = null;
    mocks.getMyRequests.mockResolvedValue([]);
    mocks.getAllBooks.mockResolvedValue([]);
    mocks.searchGoogleBooks.mockResolvedValue({ items: [] });
    mocks.getAdminRequests.mockResolvedValue([]);
    mocks.getMessages.mockResolvedValue([]);
    mocks.getClubs.mockResolvedValue([]);
    mocks.auth.isPremium = false;
    Element.prototype.scrollIntoView = vi.fn();
    mocks.getGoogleFeed.mockImplementation((topic: string, p: number) =>
      Promise.resolve({ items: page(`${topic}${p}`, 3) }),
    );
    setWidth(1280);
  });

  it('desktop: la navegación marca el ítem activo', async () => {
    renderDashboard();
    const nav = screen.getByRole('navigation', { name: 'Secciones' });
    const feed = within(nav).getByRole('button', { name: 'Feed' });
    expect(feed).toHaveAttribute('aria-current', 'page');
    expect(feed).toHaveClass('bg-forest');
    within(nav)
      .getAllByRole('button')
      .filter((button) => button !== feed)
      .forEach((button) => expect(button).not.toHaveAttribute('aria-current'));
    await waitFor(() => expect(mocks.getGoogleFeed).toHaveBeenCalledWith('fiction', 0));
  });

  it('los chips de género exponen aria-pressed y cambian el tópico', async () => {
    renderDashboard();
    const group = screen.getByRole('group', { name: 'Géneros' });
    const pressed = within(group)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((button) => button.textContent)).toEqual(['Ficción']);

    fireEvent.click(within(group).getByRole('button', { name: 'Fantasía' }));
    await waitFor(() => expect(mocks.getGoogleFeed).toHaveBeenCalledWith('fantasy', 0));
  });

  it('cargar más agrega la página siguiente a la grilla', async () => {
    const { container } = renderDashboard();
    await screen.findAllByText('Libro fiction0 0');

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
    await waitFor(() => expect(mocks.getGoogleFeed).toHaveBeenCalledWith('fiction', 1));
    await screen.findAllByText('Libro fiction1 2');

    const grid = container.querySelector('.cover-grid') as HTMLElement;
    expect(grid.children).toHaveLength(6);
  });

  it('mobile: header con sello decorativo y menú que expone la sección admin', async () => {
    setWidth(390);
    mocks.auth.token = fakeToken('admin');
    renderDashboard();

    const header = screen.getByRole('banner');
    expect(header.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    const menu = within(header).getByRole('button', { name: 'Abrir o cerrar menú' });
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).toBeNull();

    fireEvent.click(menu);
    const nav = await screen.findByRole('navigation', { name: 'Secciones' });
    expect(within(nav).getByRole('button', { name: 'Gestionar libros' })).toBeInTheDocument();
  });

  it('si falla el feed muestra un toast destructivo', async () => {
    mocks.getGoogleFeed.mockRejectedValue(new Error('boom'));
    renderDashboard();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: 'No se pudo cargar el feed de Google Books.',
        }),
      ),
    );
  });

  it('si el feed responde 429 muestra el toast de rate limit', async () => {
    mocks.getGoogleFeed.mockRejectedValue(new mocks.ApiError('x', 'rate_limited'));
    renderDashboard();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: RATE_LIMITED_MESSAGE }),
      ),
    );
    expect(mocks.toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: 'No se pudo cargar el feed de Google Books.' }),
    );
  });

  it('si el feed falla con otro ApiError muestra el mensaje de siempre', async () => {
    mocks.getGoogleFeed.mockRejectedValue(new mocks.ApiError('x', 'network'));
    renderDashboard();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'No se pudo cargar el feed de Google Books.' }),
      ),
    );
  });

  it('sidebar: tiene un enlace "Regalá un libro" hacia /regalo', () => {
    renderDashboard();
    const link = within(screen.getByRole('navigation', { name: 'Secciones' })).getByRole('link', { name: 'Regalá un libro' });
    expect(link).toHaveAttribute('href', '/regalo');
    expect(link).toHaveClass('min-h-11');
  });
});

const nav = () => screen.getByRole('navigation', { name: 'Secciones' });
const goTo = (label: string) => fireEvent.click(within(nav()).getByRole('button', { name: label }));

describe('Dashboard — otras pestañas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setWidth(1280);
    mocks.auth.token = null;
    mocks.auth.isPremium = false;
    mocks.getGoogleFeed.mockResolvedValue({ items: [] });
    mocks.getMyRequests.mockResolvedValue([]);
    mocks.getAllBooks.mockResolvedValue([]);
    mocks.searchGoogleBooks.mockResolvedValue({ items: [] });
    mocks.getAdminRequests.mockResolvedValue([]);
    mocks.getMessages.mockResolvedValue([]);
    mocks.getClubs.mockResolvedValue([]);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('feed vacío muestra el estado vacío', async () => {
    renderDashboard();
    expect(await screen.findByText('No se encontraron libros')).toBeInTheDocument();
  });

  it('buscar consulta Google Books y muestra resultados en la grilla', async () => {
    mocks.searchGoogleBooks.mockResolvedValue({ items: page('q', 2) });
    const { container } = renderDashboard();
    goTo('Buscar');
    expect(await screen.findByRole('heading', { name: 'Encontrá tu próxima lectura' })).toBeInTheDocument();
    expect(screen.getByText('¿Qué querés leer?')).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Título, autor, saga o ISBN...' });
    fireEvent.change(input, { target: { value: 'borges' } });
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(mocks.searchGoogleBooks).toHaveBeenCalledWith('borges'));
    await screen.findAllByText('Libro q 1');
    expect(container.querySelector('.cover-grid')?.children).toHaveLength(2);
  });

  it('buscar sin resultados o con error', async () => {
    mocks.searchGoogleBooks.mockResolvedValueOnce({ items: [] }).mockRejectedValueOnce(new Error('x'));
    renderDashboard();
    goTo('Buscar');
    const input = await screen.findByRole('textbox', { name: 'Título, autor, saga o ISBN...' });
    fireEvent.change(input, { target: { value: 'zzz' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();

    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Error en la búsqueda.' })),
    );
  });

  it('buscar con 429 muestra el toast de rate limit', async () => {
    mocks.searchGoogleBooks.mockRejectedValueOnce(new mocks.ApiError('x', 'rate_limited'));
    renderDashboard();
    goTo('Buscar');
    const input = await screen.findByRole('textbox', { name: 'Título, autor, saga o ISBN...' });
    fireEvent.change(input, { target: { value: 'borges' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: RATE_LIMITED_MESSAGE }),
      ),
    );
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ description: 'Error en la búsqueda.' }));
  });

  it('libros disponibles carga el catálogo y reporta errores', async () => {
    mocks.getAllBooks.mockResolvedValueOnce([{ id: '1', title: 'Rayuela', author: 'Cortázar', type: 'venta' }]);
    renderDashboard();
    goTo('Libros disponibles');
    expect(await screen.findAllByText('Rayuela')).not.toHaveLength(0);
    expect(mocks.getAllBooks).toHaveBeenCalled();
  });

  it('libros disponibles con error muestra toast destructivo', async () => {
    mocks.getAllBooks.mockRejectedValue(new Error('x'));
    renderDashboard();
    goTo('Libros disponibles');
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'No se pudieron cargar los libros.', variant: 'destructive' }),
      ),
    );
  });

  it('usuario con solicitudes resueltas ve el banner "Tus solicitudes" y abre el chat', async () => {
    mocks.auth.token = fakeToken('user');
    mocks.getMyRequests.mockResolvedValue([
      { id: 1, bookId: 1, type: 'intercambio', status: 'accepted', createdAt: '', title: 'Rayuela', coverUrl: null },
      { id: 2, bookId: 2, type: 'compra', status: 'rejected', createdAt: '', title: 'Ficciones' },
      { id: 3, bookId: 3, type: 'compra', status: 'pending', createdAt: '', title: 'Zama' },
    ]);
    renderDashboard();
    goTo('Libros disponibles');

    expect(await screen.findByText('Tus solicitudes')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rayuela' })).toHaveClass('cover-spine');
    expect(screen.getByText('Aceptado').closest('.pill')).toHaveClass('pill-forest');
    expect(screen.getByText('Rechazado').closest('.pill')).toHaveClass('pill-outline');

    fireEvent.click(screen.getByRole('button', { name: /Coordinar/ }));
    expect(await screen.findByText('Coordinar intercambio')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(mocks.auth.token, 1));
  });

  it('clubes y cerca tuyo renderizan sus pestañas', async () => {
    renderDashboard();
    goTo('Clubes');
    expect(await screen.findByText('No hay clubes todavía')).toBeInTheDocument();
    goTo('Cerca tuyo');
    expect(await screen.findByText('Encontrá clubes cerca tuyo')).toBeInTheDocument();
    expect(within(nav()).getByRole('button', { name: 'Cerca tuyo' })).toHaveAttribute('aria-current', 'page');
  });

  it('admin gestiona el catálogo y responde solicitudes', async () => {
    mocks.auth.token = fakeToken('admin');
    mocks.getAllBooks.mockResolvedValue([{ id: '1', title: 'Rayuela', author: 'Cortázar', type: 'venta' }]);
    mocks.getAdminRequests.mockResolvedValue([
      { id: 10, bookId: 1, type: 'intercambio', status: 'pending', createdAt: '', title: 'Rayuela', author: 'Cortázar', requesterUsername: 'beto' },
      { id: 11, bookId: 1, type: 'compra', status: 'pending', createdAt: '', title: 'Rayuela', author: 'Cortázar', requesterUsername: 'caro' },
      { id: 12, bookId: 2, type: 'compra', status: 'rejected', createdAt: '', title: 'Zama', author: 'Di Benedetto', requesterUsername: 'dani' },
    ]);
    mocks.respond.mockResolvedValue(undefined);
    renderDashboard();

    expect(screen.getByText('Admin', { selector: 'header .pill' })).toHaveClass('pill-forest');
    goTo('Gestionar libros');
    expect(await screen.findByText('Catálogo — 1 libro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Catálogo' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Solicitudes/ }));
    expect(await screen.findByText('beto')).toBeInTheDocument();
    expect(screen.getByText('Rechazada')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Aceptar' })[0]);
    await waitFor(() => expect(mocks.respond).toHaveBeenCalledWith(mocks.auth.token, 10, 'accepted'));
    expect(await screen.findByText('Aceptada')).toBeInTheDocument();
    expect(screen.getAllByText('Rechazada')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat' }));
    expect(await screen.findByText('Coordinar intercambio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(mocks.getAdminRequests).toHaveBeenCalledTimes(2));
  });

  it('admin: rechazar con error y carga fallida muestran toasts', async () => {
    mocks.auth.token = fakeToken('admin');
    mocks.getAdminRequests.mockResolvedValueOnce([
      { id: 20, bookId: 1, type: 'compra', status: 'pending', createdAt: '', title: 'Rayuela', requesterUsername: 'beto' },
    ]);
    mocks.respond.mockRejectedValue(new Error('x'));
    renderDashboard();
    goTo('Gestionar libros');
    fireEvent.click(await screen.findByRole('button', { name: /Solicitudes/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'No se pudo actualizar la solicitud.' })),
    );

    mocks.getAdminRequests.mockRejectedValueOnce(new Error('x'));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'No se pudieron cargar las solicitudes.' })),
    );
  });

  it('sidebar: sesión iniciada permite activar premium y cerrar sesión', async () => {
    mocks.auth.token = fakeToken('user');
    renderDashboard();
    expect(screen.getByText('Free')).toHaveClass('pill-outline');
    fireEvent.click(screen.getByRole('button', { name: /Activar Premium/ }));
    expect(await screen.findByRole('heading', { name: 'Activar Premium' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }));
    expect(mocks.auth.logout).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sesión cerrada' }));
  });

  it('sidebar: usuario premium ve la pastilla Pro', () => {
    mocks.auth.token = fakeToken('user');
    mocks.auth.isPremium = true;
    renderDashboard();
    expect(screen.getByText('Pro').closest('.pill')).toHaveClass('pill-sun');
    expect(screen.queryByRole('button', { name: /Activar Premium/ })).toBeNull();
  });

  it('sidebar: anónimo "Registrarse" abre el modal en modo registro', async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Registrarse/ }));
    expect(await screen.findByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('desktop: el botón de menú colapsa la sidebar y el redimensionado la reabre', async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o cerrar menú' }));
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Secciones' })).toBeNull());
    window.dispatchEvent(new Event('resize'));
    expect(await screen.findByRole('navigation', { name: 'Secciones' })).toBeInTheDocument();
  });

  it('mobile: elegir una sección cierra el drawer', async () => {
    setWidth(390);
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o cerrar menú' }));
    goTo('Clubes');
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Secciones' })).toBeNull());
    expect(screen.getByRole('heading', { level: 1, name: 'Clubes' })).toBeInTheDocument();
  });
});
