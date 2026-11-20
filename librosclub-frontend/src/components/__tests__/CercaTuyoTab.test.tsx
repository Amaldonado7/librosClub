import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CercaTuyoTab from '../CercaTuyoTab';
import type { Club } from '../../utils/api';

const mocks = vi.hoisted(() => {
  const popupContents: string[] = [];
  const layerGroup = { addTo: vi.fn(), clearLayers: vi.fn() };
  layerGroup.addTo.mockReturnValue(layerGroup);
  const marker = { addTo: vi.fn(), bindPopup: vi.fn(), openPopup: vi.fn() };
  marker.addTo.mockReturnValue(marker);
  marker.bindPopup.mockReturnValue(marker);
  marker.openPopup.mockReturnValue(marker);
  const map = { setView: vi.fn(), remove: vi.fn() };
  map.setView.mockReturnValue(map);
  return {
    popupContents,
    map,
    marker,
    toast: vi.fn(),
    getNearbyClubs: vi.fn(),
    leaflet: {
      divIcon: vi.fn((opts: unknown) => opts),
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      marker: vi.fn(() => marker),
      layerGroup: vi.fn(() => layerGroup),
      popup: vi.fn(() => ({
        setContent: (html: string) => {
          popupContents.push(html);
          return {};
        },
      })),
    },
  };
});

vi.mock('leaflet', () => ({ default: mocks.leaflet }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../utils/api', () => ({
  clubsAPI: { getNearbyClubs: mocks.getNearbyClubs },
}));

const malicious: Club = {
  id: 1,
  nombre: '<img src=x onerror=alert(1)>',
  ubicacion: '"><script>alert(2)</script>',
  currentBookTitle: "O'Brien & <b>Co</b>",
  lat: -34.6,
  lng: -58.4,
  creadorId: 1,
  creadorUsername: 'ana',
  fechaCreacion: '',
  miembros: 1,
  miRol: 'miembro',
  distanceKm: 1.234,
};

const plain: Club = {
  ...malicious,
  id: 2,
  nombre: 'Club Lejano',
  ubicacion: null,
  currentBookTitle: null,
  miRol: null,
  miembros: 3,
  distanceKm: undefined,
};

const withoutCoords: Club = { ...plain, id: 3, nombre: 'Club Sin Mapa', lat: null, lng: null };

const geolocationSuccess = () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (pos: { coords: { latitude: number; longitude: number } }) => void) =>
        ok({ coords: { latitude: -34.6, longitude: -58.4 } }),
    },
  });
};

const geolocationError = (code: number) => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (_ok: unknown, fail: (err: { code: number }) => void) => fail({ code }),
    },
  });
};

describe('CercaTuyoTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.popupContents.length = 0;
  });

  it('pide compartir la ubicación antes de mostrar el mapa', () => {
    geolocationSuccess();
    render(<CercaTuyoTab token="tok" />);
    expect(screen.getByText('Encontrá clubes cerca tuyo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartir ubicación/ })).toBeInTheDocument();
  });

  it('muestra los clubes cercanos y escapa el HTML de los popups', async () => {
    geolocationSuccess();
    mocks.getNearbyClubs.mockResolvedValue([malicious, plain, withoutCoords]);
    const onViewClub = vi.fn();
    render(<CercaTuyoTab token="tok" onViewClub={onViewClub} />);

    fireEvent.click(screen.getByRole('button', { name: /Compartir ubicación/ }));
    expect(await screen.findByText('Club Lejano')).toBeInTheDocument();
    await waitFor(() => expect(mocks.popupContents).toHaveLength(2));

    const [popup] = mocks.popupContents;
    expect(popup).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(popup).toContain('&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(popup).toContain('O&#39;Brien &amp; &lt;b&gt;Co&lt;/b&gt;');
    expect(popup).toContain('1.2 km');
    expect(popup).not.toContain('<img');
    expect(popup).not.toContain('<script');
    expect(mocks.popupContents[1]).toContain('3 miembros');

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(screen.getByText('1.2 km')).toHaveClass('pill');
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(onViewClub).toHaveBeenCalledWith(malicious);
  });

  it('el selector de radio usa chips con aria-pressed y vuelve a consultar', async () => {
    geolocationSuccess();
    mocks.getNearbyClubs.mockResolvedValue([]);
    render(<CercaTuyoTab token="tok" />);
    fireEvent.click(screen.getByRole('button', { name: /Compartir ubicación/ }));
    expect(await screen.findByText('No hay clubes con ubicación registrada en 20 km.')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '20 km' })).toHaveAttribute('aria-pressed', 'true');
    ['5 km', '10 km', '50 km'].forEach((label) =>
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false'),
    );
    fireEvent.click(screen.getByRole('button', { name: '5 km' }));
    await waitFor(() => expect(mocks.getNearbyClubs).toHaveBeenLastCalledWith(-34.6, -58.4, 5, 'tok'));
    expect(screen.getByRole('button', { name: '5 km' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('si falla la búsqueda muestra un toast destructivo', async () => {
    geolocationSuccess();
    mocks.getNearbyClubs.mockRejectedValue(new Error('Servicio caído'));
    render(<CercaTuyoTab token="tok" />);
    fireEvent.click(screen.getByRole('button', { name: /Compartir ubicación/ }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'Servicio caído' }),
      ),
    );
  });

  it('permiso denegado muestra el mensaje y permite reintentar', () => {
    geolocationError(1);
    render(<CercaTuyoTab token="tok" />);
    fireEvent.click(screen.getByRole('button', { name: /Compartir ubicación/ }));
    expect(screen.getByText('Ubicación no disponible')).toBeInTheDocument();
    expect(
      screen.getByText('Permiso de ubicación denegado. Habilitalo en la configuración del navegador.'),
    ).toBeInTheDocument();

    geolocationError(2);
    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(screen.getByText('No se pudo obtener tu ubicación.')).toBeInTheDocument();
  });

  it('sin soporte de geolocalización informa el error', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    render(<CercaTuyoTab token="tok" />);
    fireEvent.click(screen.getByRole('button', { name: /Compartir ubicación/ }));
    expect(screen.getByText('Tu navegador no soporta geolocalización.')).toBeInTheDocument();
  });
});
