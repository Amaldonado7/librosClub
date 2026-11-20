import React, { useState, useEffect } from 'react';
import { Club, ClubDetail, ClubMeeting, ClubPost, clubsAPI, ApiError } from '../utils/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, MapPin, Users, Trash2, Send, Navigation, Crown, Sparkles } from 'lucide-react';
import CoverArt from './brand/CoverArt';

interface Props {
  club: Club;
  token: string;
  userId: number;
  onClose: () => void;
  onClubUpdated: (updated: Club) => void;
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `hace ${diffHrs} h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
}

const UpgradeBanner: React.FC<{
  isAdmin: boolean;
  onUpgrade: () => void;
  isUpgrading: boolean;
}> = ({ isAdmin, onUpgrade, isUpgrading }) => (
  <div className="card-surface border-line-strong p-4 space-y-2">
    <div className="flex items-center gap-2">
      <span className="pill pill-sun gap-1">
        <Sparkles className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        Función Premium
      </span>
    </div>
    <p className="font-serif text-base text-wood-dark">
      El libro actual, las reuniones y el foro son exclusivos del plan Premium.
      {isAdmin ? ' Actualizá tu club para desbloquearlos.' : ' El admin del club puede actualizarlo.'}
    </p>
    {isAdmin && (
      <Button
        size="sm"
        onClick={onUpgrade}
        disabled={isUpgrading}
        variant="accent"
        className="mt-1"
      >
        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
        {isUpgrading ? 'Actualizando...' : 'Activar Premium (demo)'}
      </Button>
    )}
  </div>
);

const ClubDetailSheet: React.FC<Props> = ({ club, token, userId, onClose, onClubUpdated }) => {
  const [detail, setDetail] = useState<ClubDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Libro actual
  const [editingBook, setEditingBook] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCoverUrl, setBookCoverUrl] = useState('');
  const [isSavingBook, setIsSavingBook] = useState(false);

  // Reuniones
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetTitulo, setMeetTitulo] = useState('');
  const [meetFecha, setMeetFecha] = useState('');
  const [meetUbicacion, setMeetUbicacion] = useState('');
  const [meetDesc, setMeetDesc] = useState('');
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState<number | null>(null);

  // Ubicación
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  // Foro
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  // Plan
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { toast } = useToast();
  const isClubAdmin = detail?.miRol === 'admin';
  const isPremium = detail?.plan === 'premium';

  useEffect(() => {
    setIsLoading(true);
    clubsAPI.getClubDetail(token, club.id)
      .then(setDetail)
      .catch((err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, [club.id, token]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const result = await clubsAPI.upgradeClub(token, club.id);
      setDetail((prev) => prev ? { ...prev, plan: result.plan as 'premium', planExpiresAt: result.planExpiresAt } : prev);
      onClubUpdated({ ...club, plan: result.plan as 'premium', planExpiresAt: result.planExpiresAt });
      toast({ title: '¡Club actualizado a Premium!', description: 'Ahora tenés acceso a todas las funciones.' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSaveBook = async () => {
    if (!detail) return;
    setIsSavingBook(true);
    try {
      await clubsAPI.setCurrentBook(token, club.id, {
        title: bookTitle.trim() || null,
        author: bookAuthor.trim() || null,
        coverUrl: bookCoverUrl.trim() || null,
      });
      const updated = {
        ...detail,
        currentBookTitle: bookTitle.trim() || null,
        currentBookAuthor: bookAuthor.trim() || null,
        currentBookCoverUrl: bookCoverUrl.trim() || null,
      };
      setDetail(updated);
      onClubUpdated({ ...club, ...updated });
      setEditingBook(false);
      toast({ title: 'Libro actual actualizado' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PREMIUM_REQUIRED') {
        toast({ title: 'Plan Premium requerido', description: (err as Error).message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      }
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleClearBook = async () => {
    setIsSavingBook(true);
    try {
      await clubsAPI.setCurrentBook(token, club.id, { title: null, author: null, coverUrl: null });
      const updated = { ...detail!, currentBookTitle: null, currentBookAuthor: null, currentBookCoverUrl: null };
      setDetail(updated);
      onClubUpdated({ ...club, currentBookTitle: null, currentBookAuthor: null, currentBookCoverUrl: null });
      setEditingBook(false);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetTitulo.trim() || !meetFecha) return;
    setIsAddingMeeting(true);
    try {
      const meeting = await clubsAPI.addMeeting(token, club.id, {
        titulo: meetTitulo.trim(),
        fecha: meetFecha,
        ubicacion: meetUbicacion.trim() || undefined,
        descripcion: meetDesc.trim() || undefined,
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              meetings: [...prev.meetings, meeting].sort(
                (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
              ),
            }
          : prev
      );
      setMeetTitulo('');
      setMeetFecha('');
      setMeetUbicacion('');
      setMeetDesc('');
      setShowMeetingForm(false);
      toast({ title: 'Reunión agendada' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PREMIUM_REQUIRED') {
        toast({ title: 'Plan Premium requerido', description: (err as Error).message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      }
    } finally {
      setIsAddingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: number) => {
    setDeletingMeetingId(meetingId);
    try {
      await clubsAPI.deleteMeeting(token, club.id, meetingId);
      setDetail((prev) => prev ? { ...prev, meetings: prev.meetings.filter((m) => m.id !== meetingId) } : prev);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setDeletingMeetingId(null);
    }
  };

  const handleGeocodeAndSave = async () => {
    if (!club.ubicacion?.trim()) {
      toast({ title: 'El club no tiene ubicación de texto definida', variant: 'destructive' });
      return;
    }
    setIsGeocodingLocation(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(club.ubicacion)}&limit=1`
      );
      const data = await r.json();
      if (data.length === 0) {
        toast({ title: 'No se encontró la ubicación', variant: 'destructive' });
        return;
      }
      const newLat = parseFloat(data[0].lat);
      const newLng = parseFloat(data[0].lon);
      await clubsAPI.setClubLocation(token, club.id, { lat: newLat, lng: newLng });
      onClubUpdated({ ...club, lat: newLat, lng: newLng });
      setLocationSaved(true);
      toast({ title: 'Ubicación en mapa guardada' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setIsPosting(true);
    try {
      const post = await clubsAPI.createPost(token, club.id, postContent.trim());
      setDetail((prev) => prev ? { ...prev, posts: [post, ...prev.posts] } : prev);
      setPostContent('');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PREMIUM_REQUIRED') {
        toast({ title: 'Plan Premium requerido', description: (err as Error).message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      }
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    try {
      await clubsAPI.deletePost(token, club.id, postId);
      setDetail((prev) => prev ? { ...prev, posts: prev.posts.filter((p) => p.id !== postId) } : prev);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-6 py-5 pr-16 border-b-[1.5px] border-line flex-shrink-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-left leading-snug">{club.nombre}</SheetTitle>
            {isPremium && (
              <span className="pill pill-sun gap-1 flex-shrink-0">
                <Crown className="h-3 w-3" aria-hidden="true" />
                Premium
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {club.descripcion && <p className="font-serif text-base text-ink-muted">{club.descripcion}</p>}
            <div className="label-mono flex flex-wrap items-center gap-3 text-ink-muted mt-0.5">
              {club.ubicacion && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {club.ubicacion}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {club.miembros} {club.miembros === 1 ? 'miembro' : 'miembros'}
              </span>
              {detail?.miRol === 'admin' && club.ubicacion && !club.lat && !locationSaved && (
                <button
                  onClick={handleGeocodeAndSave}
                  disabled={isGeocodingLocation}
                  className="label-mono inline-flex min-h-11 md:min-h-0 items-center gap-1 rounded-btn text-terracotta hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  title="Guardar coordenadas para aparecer en 'Cerca tuyo'"
                  aria-label="Guardar coordenadas para aparecer en 'Cerca tuyo'"
                >
                  <Navigation className="h-3 w-3" aria-hidden="true" />
                  {isGeocodingLocation ? 'Ubicando...' : 'Ubicar en mapa'}
                </button>
              )}
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg shimmer" aria-hidden="true" />
            ))}
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="font-serif text-lg text-ink-muted">No se pudo cargar el detalle.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Libro actual */}
            <section className="card-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-normal text-xl text-forest flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-terracotta" aria-hidden="true" />
                  Libro actual
                </h3>
                {isClubAdmin && !editingBook && isPremium && (
                  <button
                    onClick={() => {
                      setBookTitle(detail.currentBookTitle ?? '');
                      setBookAuthor(detail.currentBookAuthor ?? '');
                      setBookCoverUrl(detail.currentBookCoverUrl ?? '');
                      setEditingBook(true);
                    }}
                    className="label-mono inline-flex min-h-11 md:min-h-0 items-center rounded-btn text-terracotta hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {detail.currentBookTitle ? 'Cambiar' : 'Agregar'}
                  </button>
                )}
              </div>

              {!isPremium ? (
                <UpgradeBanner isAdmin={isClubAdmin} onUpgrade={handleUpgrade} isUpgrading={isUpgrading} />
              ) : editingBook ? (
                <div className="space-y-3 bg-warm-cream border-[1.5px] border-line rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label>Título</Label>
                      <Input
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="Ej: El nombre del viento"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Autor</Label>
                      <Input
                        value={bookAuthor}
                        onChange={(e) => setBookAuthor(e.target.value)}
                        placeholder="Ej: Patrick Rothfuss"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>URL de portada (opcional)</Label>
                      <Input
                        value={bookCoverUrl}
                        onChange={(e) => setBookCoverUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveBook}
                      disabled={isSavingBook}
                      variant="accent"
                    >
                      {isSavingBook ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingBook(false)}
                    >
                      Cancelar
                    </Button>
                    {detail.currentBookTitle && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearBook}
                        disabled={isSavingBook}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground ml-auto"
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </div>
              ) : detail.currentBookTitle ? (
                <div className="flex items-center gap-3">
                  <CoverArt src={detail.currentBookCoverUrl} title={detail.currentBookTitle} size="thumb" />
                  <div>
                    <p className="font-serif text-lg text-forest leading-snug">
                      {detail.currentBookTitle}
                    </p>
                    {detail.currentBookAuthor && (
                      <p className="font-serif italic text-base text-ink-muted mt-0.5">{detail.currentBookAuthor}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="font-serif text-base text-ink-muted">
                  {isClubAdmin
                    ? 'No hay libro actual. Hacé click en "Agregar".'
                    : 'El admin del club no ha elegido un libro todavía.'}
                </p>
              )}
            </section>

            <Separator className="bg-line" />

            {/* Próximas reuniones */}
            <section className="card-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-normal text-xl text-forest flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-terracotta" aria-hidden="true" />
                  Próximas reuniones
                </h3>
                {isClubAdmin && isPremium && (
                  <button
                    onClick={() => setShowMeetingForm((v) => !v)}
                    className="label-mono inline-flex min-h-11 md:min-h-0 items-center rounded-btn text-terracotta hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {showMeetingForm ? 'Cancelar' : 'Agendar'}
                  </button>
                )}
              </div>

              {!isPremium ? (
                <p className="font-serif text-base text-ink-muted">Disponible en plan Premium.</p>
              ) : (
                <>
                  <AnimatePresence>
                    {showMeetingForm && (
                      <motion.form
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        onSubmit={handleAddMeeting}
                        className="bg-warm-cream border-[1.5px] border-line rounded-lg p-4 space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label>Título *</Label>
                            <Input
                              value={meetTitulo}
                              onChange={(e) => setMeetTitulo(e.target.value)}
                              placeholder="Ej: Encuentro mensual"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Fecha y hora *</Label>
                            <Input
                              type="datetime-local"
                              value={meetFecha}
                              onChange={(e) => setMeetFecha(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Lugar</Label>
                            <Input
                              value={meetUbicacion}
                              onChange={(e) => setMeetUbicacion(e.target.value)}
                              placeholder="Ej: Café La Paloma, Palermo"
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={isAddingMeeting || !meetTitulo.trim() || !meetFecha}
                          size="sm"
                          variant="accent"
                        >
                          {isAddingMeeting ? 'Agendando...' : 'Agendar reunión'}
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {detail.meetings.length === 0 ? (
                    <p className="font-serif text-base text-ink-muted">No hay reuniones próximas agendadas.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.meetings.map((m: ClubMeeting) => (
                        <div
                          key={m.id}
                          className="flex items-start gap-3 bg-warm-cream border-[1.5px] border-line rounded-lg px-4 py-3"
                        >
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="font-serif text-lg text-forest">{m.titulo}</p>
                            <p className="label-mono text-ink-muted normal-case tracking-[0.04em]">{fmtDate(m.fecha)}</p>
                            {m.ubicacion && (
                              <p className="label-mono text-ink-muted normal-case tracking-[0.04em] flex items-center gap-1">
                                <MapPin className="h-3 w-3" aria-hidden="true" />
                                {m.ubicacion}
                              </p>
                            )}
                            {m.descripcion && (
                              <p className="font-serif text-base text-ink-muted mt-1">{m.descripcion}</p>
                            )}
                          </div>
                          {isClubAdmin && (
                            <button
                              onClick={() => handleDeleteMeeting(m.id)}
                              disabled={deletingMeetingId === m.id}
                              className="inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-pill text-ink-muted hover:text-destructive transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <Separator className="bg-line" />

            {/* Foro */}
            <section className="card-surface p-4 space-y-3">
              <h3 className="font-serif font-normal text-xl text-forest flex items-center gap-1.5">
                <Users className="h-4 w-4 text-terracotta" aria-hidden="true" />
                Foro del club
              </h3>

              {!isPremium ? (
                <p className="font-serif text-base text-ink-muted">Disponible en plan Premium.</p>
              ) : (
                <>
                  <form onSubmit={handlePost} className="flex gap-2 items-end">
                    <Textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Escribí algo para el club..."
                      className="resize-none"
                      rows={2}
                      maxLength={1000}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (postContent.trim()) handlePost(e as unknown as React.FormEvent);
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isPosting || !postContent.trim()}
                      aria-label="Enviar"
                      className="h-11 w-11 md:h-9 md:w-9 flex-shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </form>

                  {detail.posts.length === 0 ? (
                    <p className="font-serif text-base text-ink-muted">Nadie ha publicado todavía. ¡Sé el primero!</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.posts.map((p: ClubPost) => (
                        <div key={p.id} className="bg-warm-cream border-[1.5px] border-line rounded-lg px-4 py-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="label-mono text-wood-dark">{p.autorUsername}</span>
                              <span className="label-mono text-ink-muted normal-case">{timeAgo(p.createdAt)}</span>
                            </div>
                            {(isClubAdmin || p.autorId === userId) && (
                              <button
                                onClick={() => handleDeletePost(p.id)}
                                disabled={deletingPostId === p.id}
                                className="inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-pill text-ink-muted hover:text-destructive transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                aria-label="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          <p className="font-serif text-base text-wood-dark whitespace-pre-wrap break-words">{p.contenido}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClubDetailSheet;
