import React, { useState, useEffect } from 'react';
import { Club, clubsAPI } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Plus, BookOpen, X, Check, ChevronRight, Navigation } from 'lucide-react';
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
        'bg-card border border-border rounded-xl p-5 flex flex-col gap-3 transition-shadow',
        isMember ? 'hover:shadow-card cursor-pointer' : 'hover:shadow-card'
      )}
      onClick={isMember ? () => onView(club) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        {isMember && (
          <span className={cn(
            'text-xs font-mono px-2.5 py-1 rounded-full flex-shrink-0',
            isClubAdmin
              ? 'bg-accent/20 text-accent-foreground'
              : 'bg-primary/10 text-primary'
          )}>
            {isClubAdmin ? 'Admin' : 'Miembro'}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-1">
        <p className="font-mono text-sm font-bold text-foreground leading-snug">{club.nombre}</p>
        {club.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2">{club.descripcion}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
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

      {!isAdmin && (
        isClubAdmin ? (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary" />
              Sos el creador
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ) : isMember ? (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onLeave(club); }}
              disabled={loading}
              className="flex-1 text-xs h-8 text-muted-foreground hover:text-destructive hover:border-destructive"
            >
              Salir
            </Button>
            <div className="flex items-center text-xs text-muted-foreground gap-1 px-2">
              Ver detalle <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onJoin(club); }}
            disabled={loading}
            className="w-full text-xs h-8 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="h-3 w-3 mr-1.5" />
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-44 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div>
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4 text-accent" />
                    Nuevo club de lectura
                  </h3>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-mono">Nombre *</Label>
                      <Input
                        placeholder="Ej: Club Fantástico Palermo"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-mono">Ubicación</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej: Palermo, CABA"
                          value={ubicacion}
                          onChange={(e) => { setUbicacion(e.target.value); setLat(null); setLng(null); }}
                          className="bg-background"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={handleGeocode}
                          disabled={isGeocoding || !ubicacion.trim()}
                          title="Ubicar en mapa"
                          className={cn('flex-shrink-0 h-10 w-10', lat !== null && 'border-primary text-primary')}
                        >
                          <Navigation className={cn('h-4 w-4', isGeocoding && 'animate-pulse')} />
                        </Button>
                      </div>
                      {lat !== null && (
                        <p className="text-xs text-primary font-mono">
                          Coordenadas guardadas ({lat.toFixed(4)}, {lng?.toFixed(4)})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-mono">Descripción</Label>
                    <Textarea
                      placeholder="Contá de qué trata el club, cuándo se reúnen, qué leen..."
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="bg-background text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
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
                className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                <Plus className="h-4 w-4" />
                Crear nuevo club
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-mono text-sm font-bold text-foreground">No hay clubes todavía</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'Creá el primero usando el botón de arriba.' : 'Cuando haya clubes disponibles, los verás acá.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
