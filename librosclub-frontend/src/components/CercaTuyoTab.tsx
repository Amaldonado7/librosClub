import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Club, clubsAPI } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MapPin, Users, BookOpen, Navigation, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  token: string | null;
  onViewClub?: (club: Club) => void;
}

const RADIUS_OPTIONS = [5, 10, 20, 50] as const;

function makeClubIcon(isMember: boolean) {
  const color = isMember ? '#5c7a6b' : '#7c6e5b';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
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
      const popup = L.popup({ maxWidth: 240 }).setContent(`
        <div style="font-family:monospace;font-size:13px">
          <strong>${club.nombre}</strong><br/>
          ${club.ubicacion ? `<span style="font-size:11px;color:#666">📍 ${club.ubicacion}</span><br/>` : ''}
          <span style="font-size:11px;color:#666">👥 ${club.miembros} ${club.miembros === 1 ? 'miembro' : 'miembros'}</span>
          ${club.distanceKm !== undefined ? `<br/><span style="font-size:11px;color:#666">📏 ${club.distanceKm.toFixed(1)} km</span>` : ''}
          ${club.currentBookTitle ? `<br/><span style="font-size:11px;color:#666">📖 ${club.currentBookTitle}</span>` : ''}
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
        <MapPin className="h-10 w-10 text-muted-foreground/30" />
        <p className="font-mono text-sm font-bold text-foreground">Ubicación no disponible</p>
        <p className="text-xs text-muted-foreground max-w-xs">{locationError}</p>
        <Button size="sm" onClick={requestLocation} variant="outline">
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Navigation className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-mono text-sm font-bold text-foreground">Encontrá clubes cerca tuyo</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Necesitamos tu ubicación para mostrar los clubes en el mapa.
          </p>
        </div>
        <Button onClick={requestLocation} disabled={isLocating} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isLocating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Obteniendo ubicación...</> : <><Navigation className="h-4 w-4 mr-2" /> Compartir ubicación</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-mono text-sm font-bold text-foreground">Clubes cercanos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoadingClubs ? 'Buscando...' : `${clubs.length} ${clubs.length === 1 ? 'club' : 'clubes'} en un radio de ${radius} km`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-mono mr-1">Radio:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-mono border transition-colors',
                radius === r
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'
              )}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full rounded-xl overflow-hidden border border-border isolate"
        style={{ height: 420 }}
      />

      {clubs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clubs.map((club) => (
            <div
              key={club.id}
              className="bg-card border border-border rounded-xl p-4 space-y-2 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-sm font-bold text-foreground leading-snug">{club.nombre}</p>
                {club.distanceKm !== undefined && (
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0 bg-muted px-2 py-0.5 rounded-full">
                    {club.distanceKm.toFixed(1)} km
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {club.ubicacion && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {club.ubicacion}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  {club.miembros} {club.miembros === 1 ? 'miembro' : 'miembros'}
                </span>
                {club.currentBookTitle && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{club.currentBookTitle}</span>
                  </span>
                )}
              </div>
              {club.miRol && onViewClub && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewClub(club)}
                  className="w-full text-xs h-7"
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
          <p className="text-sm text-muted-foreground">No hay clubes con ubicación registrada en {radius} km.</p>
          <p className="text-xs text-muted-foreground mt-1">Los admins de clubes pueden agregar su ubicación desde el detalle del club.</p>
        </div>
      )}
    </div>
  );
};

export default CercaTuyoTab;
