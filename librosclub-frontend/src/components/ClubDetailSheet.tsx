import React, { useState, useEffect } from 'react';
import { Club, ClubDetail, ClubMeeting, ClubPost, clubsAPI } from '../utils/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, MapPin, Users, Trash2, Send, Navigation } from 'lucide-react';

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

  const { toast } = useToast();
  const isClubAdmin = detail?.miRol === 'admin';

  useEffect(() => {
    setIsLoading(true);
    clubsAPI.getClubDetail(token, club.id)
      .then(setDetail)
      .catch((err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, [club.id, token]);

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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsAddingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: number) => {
    setDeletingMeetingId(meetingId);
    try {
      await clubsAPI.deleteMeeting(token, club.id, meetingId);
      setDetail((prev) => prev ? { ...prev, meetings: prev.meetings.filter((m) => m.id !== meetingId) } : prev);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    try {
      await clubsAPI.deletePost(token, club.id, postId);
      setDetail((prev) => prev ? { ...prev, posts: prev.posts.filter((p) => p.id !== postId) } : prev);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-6 py-5 border-b border-border flex-shrink-0">
          <SheetTitle className="font-mono text-base text-left leading-snug">{club.nombre}</SheetTitle>
          <div className="flex flex-col gap-1 mt-1">
            {club.descripcion && <p className="text-xs text-muted-foreground">{club.descripcion}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {club.ubicacion && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {club.ubicacion}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {club.miembros} {club.miembros === 1 ? 'miembro' : 'miembros'}
              </span>
              {detail?.miRol === 'admin' && club.ubicacion && !club.lat && !locationSaved && (
                <button
                  onClick={handleGeocodeAndSave}
                  disabled={isGeocodingLocation}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  title="Guardar coordenadas para aparecer en 'Cerca tuyo'"
                >
                  <Navigation className="h-3 w-3" />
                  {isGeocodingLocation ? 'Ubicando...' : 'Ubicar en mapa'}
                </button>
              )}
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">No se pudo cargar el detalle.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Libro actual */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Libro actual
                </h3>
                {isClubAdmin && !editingBook && (
                  <button
                    onClick={() => {
                      setBookTitle(detail.currentBookTitle ?? '');
                      setBookAuthor(detail.currentBookAuthor ?? '');
                      setBookCoverUrl(detail.currentBookCoverUrl ?? '');
                      setEditingBook(true);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {detail.currentBookTitle ? 'Cambiar' : 'Agregar'}
                  </button>
                )}
              </div>

              {editingBook ? (
                <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-mono">Título</Label>
                      <Input
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="Ej: El nombre del viento"
                        className="bg-background text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-mono">Autor</Label>
                      <Input
                        value={bookAuthor}
                        onChange={(e) => setBookAuthor(e.target.value)}
                        placeholder="Ej: Patrick Rothfuss"
                        className="bg-background text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-mono">URL de portada (opcional)</Label>
                      <Input
                        value={bookCoverUrl}
                        onChange={(e) => setBookCoverUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveBook}
                      disabled={isSavingBook}
                      className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8"
                    >
                      {isSavingBook ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingBook(false)}
                      className="text-xs h-8"
                    >
                      Cancelar
                    </Button>
                    {detail.currentBookTitle && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearBook}
                        disabled={isSavingBook}
                        className="text-xs h-8 text-destructive hover:text-destructive ml-auto"
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </div>
              ) : detail.currentBookTitle ? (
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {detail.currentBookCoverUrl ? (
                      <img
                        src={detail.currentBookCoverUrl}
                        alt={detail.currentBookTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-foreground leading-snug">
                      {detail.currentBookTitle}
                    </p>
                    {detail.currentBookAuthor && (
                      <p className="text-xs text-muted-foreground mt-0.5">{detail.currentBookAuthor}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isClubAdmin
                    ? 'No hay libro actual. Hacé click en "Agregar".'
                    : 'El admin del club no ha elegido un libro todavía.'}
                </p>
              )}
            </section>

            <Separator />

            {/* Próximas reuniones */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Próximas reuniones
                </h3>
                {isClubAdmin && (
                  <button
                    onClick={() => setShowMeetingForm((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showMeetingForm ? 'Cancelar' : 'Agendar'}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showMeetingForm && (
                  <motion.form
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onSubmit={handleAddMeeting}
                    className="bg-card border border-border rounded-xl p-4 space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground font-mono">Título *</Label>
                        <Input
                          value={meetTitulo}
                          onChange={(e) => setMeetTitulo(e.target.value)}
                          placeholder="Ej: Encuentro mensual"
                          className="bg-background text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground font-mono">Fecha y hora *</Label>
                        <Input
                          type="datetime-local"
                          value={meetFecha}
                          onChange={(e) => setMeetFecha(e.target.value)}
                          className="bg-background text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground font-mono">Lugar</Label>
                        <Input
                          value={meetUbicacion}
                          onChange={(e) => setMeetUbicacion(e.target.value)}
                          placeholder="Ej: Café La Paloma, Palermo"
                          className="bg-background text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isAddingMeeting || !meetTitulo.trim() || !meetFecha}
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8"
                    >
                      {isAddingMeeting ? 'Agendando...' : 'Agendar reunión'}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {detail.meetings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay reuniones próximas agendadas.</p>
              ) : (
                <div className="space-y-2">
                  {detail.meetings.map((m: ClubMeeting) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-mono text-sm font-bold text-foreground">{m.titulo}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(m.fecha)}</p>
                        {m.ubicacion && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {m.ubicacion}
                          </p>
                        )}
                        {m.descripcion && (
                          <p className="text-xs text-muted-foreground mt-1">{m.descripcion}</p>
                        )}
                      </div>
                      {isClubAdmin && (
                        <button
                          onClick={() => handleDeleteMeeting(m.id)}
                          disabled={deletingMeetingId === m.id}
                          className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-0.5 mt-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Foro */}
            <section className="space-y-3 pb-4">
              <h3 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Foro del club
              </h3>

              <form onSubmit={handlePost} className="flex gap-2 items-end">
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Escribí algo para el club..."
                  className="bg-card text-sm resize-none"
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
                  className="h-9 w-9 flex-shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>

              {detail.posts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nadie ha publicado todavía. ¡Sé el primero!</p>
              ) : (
                <div className="space-y-2">
                  {detail.posts.map((p: ClubPost) => (
                    <div key={p.id} className="bg-card border border-border rounded-xl px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">{p.autorUsername}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                        </div>
                        {(isClubAdmin || p.autorId === userId) && (
                          <button
                            onClick={() => handleDeletePost(p.id)}
                            disabled={deletingPostId === p.id}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-0.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{p.contenido}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClubDetailSheet;
