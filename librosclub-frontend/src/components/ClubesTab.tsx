import React, { useState, useEffect } from 'react';
import { Club, clubsAPI } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Plus, BookOpen, X, Check, ChevronRight, Navigation, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClubDetailSheet from './ClubDetailSheet';

interface Props {
  token: string | null;
  isAdmin: boolean;
  userId: number;
  onAuthRequired?: () => void;
}

const ClubCard: React.FC<{
  club: Club;
  index: number;
  isAdmin: boolean;
  onJoin: (club: Club) => void;
  onLeave: (club: Club) => void;
  onView: (club: Club) => void;
  loading: boolean;
}> = ({ club, index, isAdmin, onJoin, onLeave, onView, loading }) => {
  const isMember = !!club.miRol;
  const isClubAdmin = club.miRol === 'admin';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className={cn(
        'card-surface p-5 flex flex-col gap-3 transition-colors',
        isMember ? 'hover:border-line-strong cursor-pointer' : 'hover:border-line-strong'
      )}
      onClick={isMember ? () => onView(club) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-10 w-10 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-5 w-5 text-sunlight" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {club.plan === 'premium' && (
            <span className="pill pill-sun gap-1">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Premium
            </span>
          )}
          {isMember && (
            <span className="pill pill-forest">
              {isClubAdmin ? 'Admin' : 'Miembro'}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <p className="font-serif text-[22px] leading-snug text-forest">{club.nombre}</p>
        {club.descripcion && (
          <p className="font-serif text-base text-ink-muted line-clamp-2">{club.descripcion}</p>
        )}
      </div>

      <div className="label-mono flex flex-col gap-1.5 text-ink-muted normal-case tracking-[0.04em]">
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

      {!isAdmin && (
        isClubAdmin ? (
          <div className="flex items-center justify-between pt-1">
            <div className="label-mono flex items-center gap-1.5 text-ink-muted">
              <Check className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
              Sos el creador
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
          </div>
        ) : isMember ? (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onLeave(club); }}
              disabled={loading}
              className="flex-1 hover:bg-destructive hover:border-destructive"
            >
              Salir
            </Button>
            <div className="label-mono flex items-center text-ink-muted gap-1 px-2">
              Ver detalle <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onJoin(club); }}
            disabled={loading}
            variant="accent"
            className="w-full"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Unirse
          </Button>
        )
      )}
    </motion.div>
  );
};

const ClubesTab: React.FC<Props> = ({ token, isAdmin, userId, onAuthRequired }) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    clubsAPI.getClubs(token)
      .then(setClubs)
      .catch(() => toast({ title: 'Error', description: 'No se pudieron cargar los clubes.', variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleGeocode = async () => {
    if (!ubicacion.trim()) {
      toast({ title: 'Ingresá una ubicación para geocodificar', variant: 'destructive' });
      return;
    }
    setIsGeocoding(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ubicacion)}&limit=1`
      );
      const data = await r.json();
      if (data.length === 0) {
        toast({ title: 'No se encontró la ubicación', description: 'Probá con otra dirección.', variant: 'destructive' });
        return;
      }
      setLat(parseFloat(data[0].lat));
      setLng(parseFloat(data[0].lon));
      toast({ title: 'Ubicación encontrada', description: data[0].display_name.split(',').slice(0, 2).join(',') });
    } catch {
      toast({ title: 'Error al geocodificar', variant: 'destructive' });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { onAuthRequired?.(); return; }
    if (!nombre.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    setIsCreating(true);

    let finalLat = lat;
    let finalLng = lng;
    if (ubicacion.trim() && lat === null) {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ubicacion)}&limit=1`
        );
        const data = await r.json();
        if (data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);
        }
      } catch { /* non-fatal, proceed without coords */ }
    }

    try {
      const club = await clubsAPI.createClub(token, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        ubicacion: ubicacion.trim() || undefined,
        lat: finalLat,
        lng: finalLng,
      });
      setClubs((prev) => [club, ...prev]);
      setNombre(''); setDescripcion(''); setUbicacion(''); setLat(null); setLng(null);
      setShowForm(false);
      toast({ title: 'Club creado', description: `"${club.nombre}" fue creado.` });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (club: Club) => {
    if (!token) { onAuthRequired?.(); return; }
    setActionId(club.id);
    try {
      await clubsAPI.joinClub(token, club.id);
      setClubs((prev) => prev.map((c) =>
        c.id === club.id ? { ...c, miembros: c.miembros + 1, miRol: 'miembro' } : c
      ));
      toast({ title: `Te uniste a "${club.nombre}"` });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleLeave = async (club: Club) => {
    if (!token) { onAuthRequired?.(); return; }
    setActionId(club.id);
    try {
      await clubsAPI.leaveClub(token, club.id);
      setClubs((prev) => prev.map((c) =>
        c.id === club.id ? { ...c, miembros: c.miembros - 1, miRol: null } : c
      ));
      toast({ title: `Saliste de "${club.nombre}"` });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleClubUpdated = (updated: Club) => {
    setClubs((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    setSelectedClub((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-surface shimmer h-44" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {isAdmin && (
        <div>
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="card-surface p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-serif font-normal text-2xl text-forest flex items-center gap-2">
                    <Plus className="h-5 w-5 text-terracotta" aria-hidden="true" />
                    Nuevo club de lectura
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    aria-label="Cerrar"
                    className="inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-pill text-ink-muted hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-surface"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nombre *</Label>
                      <Input
                        placeholder="Ej: Club Fantástico Palermo"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ubicación</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej: Palermo, CABA"
                          value={ubicacion}
                          onChange={(e) => { setUbicacion(e.target.value); setLat(null); setLng(null); }}
                          />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={handleGeocode}
                          disabled={isGeocoding || !ubicacion.trim()}
                          title="Ubicar en mapa"
                          aria-label="Ubicar en mapa"
                          className={cn('flex-shrink-0 h-11 w-11', lat !== null && 'bg-forest text-warm-cream')}
                        >
                          <Navigation className={cn('h-4 w-4', isGeocoding && 'animate-pulse')} aria-hidden="true" />
                        </Button>
                      </div>
                      {lat !== null && (
                        <p className="label-mono text-forest normal-case">
                          Coordenadas guardadas ({lat.toFixed(4)}, {lng?.toFixed(4)})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descripción</Label>
                    <Textarea
                      placeholder="Contá de qué trata el club, cuándo se reúnen, qué leen..."
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    variant="accent"
                  >
                    {isCreating ? 'Creando...' : 'Crear club'}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.button
                key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowForm(true)}
                className="label-mono w-full min-h-11 flex items-center justify-center gap-2 border-[1.5px] border-dashed border-control rounded-lg py-4 text-ink-muted hover:text-forest hover:border-forest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear nuevo club
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-forest">
            <BookOpen className="h-8 w-8 text-sunlight" aria-hidden="true" />
          </span>
          <p className="font-serif text-[27px] text-forest">No hay clubes todavía</p>
          <p className="font-serif text-lg text-ink-muted">
            {isAdmin ? 'Creá el primero usando el botón de arriba.' : 'Cuando haya clubes disponibles, los verás acá.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4">
          {clubs.map((club, i) => (
            <ClubCard
              key={club.id}
              club={club}
              index={i}
              isAdmin={isAdmin}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onView={setSelectedClub}
              loading={actionId === club.id}
            />
          ))}
        </div>
      )}

      {selectedClub && token && (
        <ClubDetailSheet
          club={selectedClub}
          token={token}
          userId={userId}
          onClose={() => setSelectedClub(null)}
          onClubUpdated={handleClubUpdated}
        />
      )}
    </div>
  );
};

export default ClubesTab;
