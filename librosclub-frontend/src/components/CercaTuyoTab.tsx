import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Club, clubsAPI } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MapPin, Users, BookOpen, Navigation, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { escapeHtml } from '@/lib/escape-html';

interface Props {
  token: string | null;
  onViewClub?: (club: Club) => void;
}

const RADIUS_OPTIONS = [5, 10, 20, 50] as const;

function makeClubIcon(isMember: boolean) {
  const color = isMember ? '#5E5827' : '#91551F';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:${color};border:3px solid #FFFBF2;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#F2D661;border:3px solid #492710;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const CercaTuyoTab: React.FC<Props> = ({ token, onViewClub }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [radius, setRadius] = useState<number>(20);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const { toast } = useToast();

  const initMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    L.marker([lat, lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>Vos estás acá</b>')
      .openPopup();
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
  };

  const updateMarkers = (nearbyClubs: Club[]) => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    nearbyClubs.forEach((club) => {
      if (club.lat == null || club.lng == null) return;
      const isMember = !!club.miRol;
      const members = Number(club.miembros);
      const meta = 'font-family:IBM Plex Mono,monospace;font-size:11px;color:#6B4A2A';
      const popup = L.popup({ maxWidth: 240 }).setContent(`
        <div style="color:#492710">
          <strong style="font-family:Sorts Mill Goudy,Georgia,serif;font-size:16px;font-weight:400">${escapeHtml(club.nombre)}</strong><br/>
          ${club.ubicacion ? `<span style="${meta}">📍 ${escapeHtml(club.ubicacion)}</span><br/>` : ''}
          <span style="${meta}">👥 ${String(members)} ${members === 1 ? 'miembro' : 'miembros'}</span>
          ${club.distanceKm !== undefined ? `<br/><span style="${meta}">📏 ${Number(club.distanceKm).toFixed(1)} km</span>` : ''}
          ${club.currentBookTitle ? `<br/><span style="${meta}">📖 ${escapeHtml(club.currentBookTitle)}</span>` : ''}
        </div>
      `);
      L.marker([club.lat!, club.lng!], { icon: makeClubIcon(isMember) })
        .addTo(markersRef.current!)
        .bindPopup(popup);
    });
  };

  const fetchNearbyClubs = async (lat: number, lng: number, r: number) => {
    setIsLoadingClubs(true);
    try {
      const data = await clubsAPI.getNearbyClubs(lat, lng, r, token);
      setClubs(data);
      updateMarkers(data);
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], r <= 5 ? 14 : r <= 10 ? 13 : r <= 20 ? 12 : 11);
      }
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsLoadingClubs(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocationError(null);
        setIsLocating(false);
        setTimeout(() => {
          initMap(latitude, longitude);
          fetchNearbyClubs(latitude, longitude, radius);
        }, 50);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(
          err.code === 1
            ? 'Permiso de ubicación denegado. Habilitalo en la configuración del navegador.'
            : 'No se pudo obtener tu ubicación.'
        );
      },
      { timeout: 10000 }
    );
  };

  const handleRadiusChange = (r: number) => {
    setRadius(r);
    if (location) fetchNearbyClubs(location.lat, location.lng, r);
  };

  useEffect(() => {
    return () => { mapRef.current?.remove(); };
  }, []);

  if (locationError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-forest">
          <MapPin className="h-8 w-8 text-sunlight" aria-hidden="true" />
        </span>
        <p className="font-serif text-[27px] text-forest">Ubicación no disponible</p>
        <p className="font-serif text-lg text-ink-muted max-w-xs">{locationError}</p>
        <Button onClick={requestLocation} variant="outline">
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-forest">
          <Navigation className="h-8 w-8 text-sunlight" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1 items-center">
          <p className="font-serif text-[27px] text-forest">Encontrá clubes cerca tuyo</p>
          <p className="font-serif text-lg text-ink-muted max-w-xs">
            Necesitamos tu ubicación para mostrar los clubes en el mapa.
          </p>
        </div>
        <Button onClick={requestLocation} disabled={isLocating} variant="accent">
          {isLocating ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Obteniendo ubicación...</> : <><Navigation className="h-4 w-4" aria-hidden="true" /> Compartir ubicación</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif font-normal text-[30px] leading-tight text-forest">Clubes cercanos</h2>
          <p className="label-mono text-ink-muted normal-case tracking-[0.04em]">
            {isLoadingClubs ? 'Buscando...' : `${clubs.length} ${clubs.length === 1 ? 'club' : 'clubes'} en un radio de ${radius} km`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label-mono text-ink-muted mr-1">Radio:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={radius === r}
              onClick={() => handleRadiusChange(r)}
              className={cn('chip px-3.5', radius === r ? 'chip-on' : 'chip-off')}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full rounded-lg overflow-hidden border-[1.5px] border-line isolate"
        style={{ height: 420 }}
      />

      {clubs.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-3">
          {clubs.map((club) => (
            <div
              key={club.id}
              className="card-surface p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-serif text-[22px] leading-snug text-forest">{club.nombre}</p>
                {club.distanceKm !== undefined && (
                  <span className="pill pill-outline text-ink-muted flex-shrink-0">
                    {club.distanceKm.toFixed(1)} km
                  </span>
                )}
              </div>
              <div className="label-mono flex flex-col gap-1 text-ink-muted normal-case tracking-[0.04em]">
                {club.ubicacion && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    {club.ubicacion}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  {club.miembros} {club.miembros === 1 ? 'miembro' : 'miembros'}
                </span>
                {club.currentBookTitle && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{club.currentBookTitle}</span>
                  </span>
                )}
              </div>
              {club.miRol && onViewClub && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewClub(club)}
                  className="w-full"
                >
                  Ver detalle
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoadingClubs && clubs.length === 0 && (
        <div className="text-center py-8">
          <p className="font-serif text-lg text-ink-muted">No hay clubes con ubicación registrada en {radius} km.</p>
          <p className="font-serif text-base text-ink-muted mt-1">Los admins de clubes pueden agregar su ubicación desde el detalle del club.</p>
        </div>
      )}
    </div>
  );
};

export default CercaTuyoTab;
