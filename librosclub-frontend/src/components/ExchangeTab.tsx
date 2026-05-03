import React, { useState, useEffect } from 'react';
import { exchangeAPI, ExchangeListing, MyListing } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  BookOpen, Plus, Trash2, ArrowLeftRight,
  CheckCircle, XCircle, Clock, ImageOff, RefreshCw,
} from 'lucide-react';

interface Props {
  token: string;
  currentUserId: number;
}

type View = 'explore' | 'mine';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pendiente', className: 'bg-accent/20 text-foreground' },
  accepted: { label: 'Aceptado',  className: 'bg-primary/15 text-primary' },
  rejected: { label: 'Rechazado', className: 'bg-destructive/10 text-destructive' },
};

// ── Thumbnail pequeño ──────────────────────────────────────────
const Thumb: React.FC<{ url?: string | null; title: string; size?: 'sm' | 'md' }> = ({
  url, title, size = 'md',
}) => {
  const [err, setErr] = useState(false);
  const dim = size === 'sm' ? 'w-10 h-14' : 'w-16 h-[88px]';
  return (
    <div className={`${dim} flex-shrink-0 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center`}>
      {url && !err ? (
        <img src={url} alt={title} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <BookOpen className="h-4 w-4 text-muted-foreground/40" />
      )}
    </div>
  );
};

// ── Formulario nueva publicación ───────────────────────────────
const NewListingForm: React.FC<{ token: string; onCreated: (l: ExchangeListing) => void; onClose: () => void }> = ({
  token, onCreated, onClose,
}) => {
  const [title, setTitle]       = useState('');
  const [author, setAuthor]     = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [imgErr, setImgErr]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      toast({ title: 'Campos requeridos', description: 'Título y autor son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const listing = await exchangeAPI.createListing(token, {
        title: title.trim(), author: author.trim(),
        coverUrl: coverUrl.trim() || undefined,
        description: description.trim() || undefined,
      });
      onCreated(listing);
      toast({ title: 'Publicado', description: `"${listing.title}" ya está disponible para intercambiar.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card border border-border rounded-xl p-5 shadow-card"
    >
      <p className="font-mono text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <Plus className="h-4 w-4 text-accent" /> Publicar un libro
      </p>
      <form onSubmit={handleSubmit} className="flex gap-4">
        {/* Preview */}
        <div className="flex-shrink-0 w-16 h-[88px] rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
          {coverUrl && !imgErr ? (
            <img src={coverUrl} alt="preview" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          ) : imgErr ? (
            <ImageOff className="h-4 w-4 text-muted-foreground/40" />
          ) : (
            <BookOpen className="h-4 w-4 text-muted-foreground/40" />
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del libro" className="h-8 bg-background text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Autor *</Label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Nombre del autor" className="h-8 bg-background text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">URL de portada</Label>
              <Input value={coverUrl} onChange={(e) => { setCoverUrl(e.target.value); setImgErr(false); }} placeholder="https://..." className="h-8 bg-background text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Descripción / Estado</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: buen estado, sin subrayados" className="h-8 bg-background text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? 'Publicando...' : 'Publicar'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

// ── Vista Explorar ─────────────────────────────────────────────
const ExploreView: React.FC<{
  token: string;
  listings: ExchangeListing[];
  loading: boolean;
  onRequest: (id: number) => void;
  requestingId: number | null;
}> = ({ listings, loading, onRequest, requestingId }) => {
  if (loading) return <p className="text-sm text-muted-foreground px-1">Cargando...</p>;
  if (listings.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <ArrowLeftRight className="h-10 w-10 text-muted-foreground/30" />
      <p className="font-mono text-sm font-bold text-foreground">Sin publicaciones aún</p>
      <p className="text-xs text-muted-foreground">Sé el primero en publicar un libro para intercambiar.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {listings.map((l, i) => {
        const req = l.myRequestStatus;
        return (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:shadow-card transition-shadow"
          >
            <Thumb url={l.coverUrl} title={l.title} />

            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-bold text-foreground truncate">{l.title}</p>
              <p className="text-xs text-muted-foreground truncate">{l.author}</p>
              {l.description && <p className="text-xs text-muted-foreground/70 mt-1 truncate italic">"{l.description}"</p>}
              <p className="text-xs text-muted-foreground/60 mt-1">por <span className="font-medium">{l.username}</span></p>
            </div>

            <div className="flex-shrink-0">
              {req === 'pending' && (
                <span className="flex items-center gap-1.5 text-xs font-mono bg-accent/20 text-foreground px-3 py-1.5 rounded-full">
                  <Clock className="h-3 w-3" /> Pendiente
                </span>
              )}
              {req === 'accepted' && (
                <span className="flex items-center gap-1.5 text-xs font-mono bg-primary/15 text-primary px-3 py-1.5 rounded-full">
                  <CheckCircle className="h-3 w-3" /> Aceptado
                </span>
              )}
              {req === 'rejected' && (
                <span className="flex items-center gap-1.5 text-xs font-mono bg-destructive/10 text-destructive px-3 py-1.5 rounded-full">
                  <XCircle className="h-3 w-3" /> Rechazado
                </span>
              )}
              {!req && (
                <Button
                  size="sm"
                  onClick={() => onRequest(l.id)}
                  disabled={requestingId === l.id}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                >
                  {requestingId === l.id ? '...' : 'Solicitar'}
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ── Vista Mis publicaciones ────────────────────────────────────
const MyListingsView: React.FC<{
  token: string;
  listings: MyListing[];
  loading: boolean;
  onDeleted: (id: number) => void;
  onResponded: (listingId: number, requestId: number, status: 'accepted' | 'rejected') => void;
}> = ({ token, listings, loading, onDeleted, onResponded }) => {
  const [deletingId, setDeletingId]     = useState<number | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await exchangeAPI.deleteListing(token, id);
      onDeleted(id);
      toast({ title: 'Eliminado', description: 'Tu publicación fue eliminada.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRespond = async (listingId: number, requestId: number, status: 'accepted' | 'rejected') => {
    setRespondingId(requestId);
    try {
      await exchangeAPI.respondToRequest(token, requestId, status);
      onResponded(listingId, requestId, status);
      toast({
        title: status === 'accepted' ? 'Intercambio aceptado' : 'Solicitud rechazada',
        description: status === 'accepted' ? 'Coordiná con el solicitante para el intercambio.' : undefined,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground px-1">Cargando...</p>;
  if (listings.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <BookOpen className="h-10 w-10 text-muted-foreground/30" />
      <p className="font-mono text-sm font-bold text-foreground">No publicaste ningún libro aún</p>
      <p className="text-xs text-muted-foreground">Usá el botón "Publicar libro" para ofrecer uno.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {listings.map((l) => {
        const pending = l.requests.filter((r) => r.status === 'pending');
        const accepted = l.requests.find((r) => r.status === 'accepted');

        return (
          <div key={l.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header del libro */}
            <div className="flex items-center gap-4 p-4">
              <Thumb url={l.coverUrl} title={l.title} />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold text-foreground truncate">{l.title}</p>
                <p className="text-xs text-muted-foreground truncate">{l.author}</p>
                {l.description && <p className="text-xs text-muted-foreground/70 mt-1 italic truncate">"{l.description}"</p>}
                <span className={cn(
                  'inline-block mt-1.5 text-xs font-mono px-2 py-0.5 rounded-md',
                  l.status === 'available' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {l.status === 'available' ? 'Disponible' : 'Intercambiado'}
                </span>
              </div>
              <Button
                size="sm" variant="ghost"
                onClick={() => handleDelete(l.id)}
                disabled={deletingId === l.id}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Solicitudes */}
            {accepted && (
              <div className="border-t border-border px-4 py-3 bg-primary/5">
                <p className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Intercambiado con <span className="underline">{accepted.requesterUsername}</span>
                </p>
              </div>
            )}

            {!accepted && pending.length > 0 && (
              <div className="border-t border-border divide-y divide-border">
                <p className="px-4 py-2 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wide">
                  {pending.length} {pending.length === 1 ? 'solicitud' : 'solicitudes'}
                </p>
                {pending.map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{req.requesterUsername}</span>
                      <span className="text-muted-foreground text-xs ml-2">quiere este libro</span>
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(l.id, req.id, 'accepted')}
                        disabled={respondingId === req.id}
                        className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Aceptar
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => handleRespond(l.id, req.id, 'rejected')}
                        disabled={respondingId === req.id}
                        className="h-7 px-3 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!accepted && pending.length === 0 && l.requests.length > 0 && (
              <div className="border-t border-border px-4 py-2.5">
                <p className="text-xs text-muted-foreground">Sin solicitudes pendientes.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Componente principal ───────────────────────────────────────
const ExchangeTab: React.FC<Props> = ({ token, currentUserId }) => {
  const [view, setView]             = useState<View>('explore');
  const [showForm, setShowForm]     = useState(false);
  const [listings, setListings]     = useState<ExchangeListing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [loadingMine, setLoadingMine]       = useState(false);
  const [requestingId, setRequestingId]     = useState<number | null>(null);
  const { toast } = useToast();

  const fetchListings = async () => {
    setLoadingExplore(true);
    try { setListings(await exchangeAPI.getListings(token)); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setLoadingExplore(false); }
  };

  const fetchMyListings = async () => {
    setLoadingMine(true);
    try { setMyListings(await exchangeAPI.getMyListings(token)); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setLoadingMine(false); }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleViewChange = (v: View) => {
    setView(v);
    setShowForm(false);
    if (v === 'mine') fetchMyListings();
    if (v === 'explore') fetchListings();
  };

  const handleCreated = (listing: ExchangeListing) => {
    setShowForm(false);
    // Agregar a mis publicaciones
    setMyListings((prev) => [{ ...listing, requests: [] }, ...prev]);
    // Recargar explore
    fetchListings();
  };

  const handleRequest = async (listingId: number) => {
    setRequestingId(listingId);
    try {
      await exchangeAPI.requestExchange(token, listingId);
      setListings((prev) =>
        prev.map((l) => l.id === listingId ? { ...l, myRequestStatus: 'pending' } : l)
      );
      toast({ title: 'Solicitud enviada', description: 'El dueño del libro verá tu solicitud.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      if (err.message?.includes('ya no está disponible')) {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      }
    } finally {
      setRequestingId(null);
    }
  };

  const handleDeleted = (id: number) => {
    setMyListings((prev) => prev.filter((l) => l.id !== id));
    fetchListings();
  };

  const handleResponded = (listingId: number, requestId: number, status: 'accepted' | 'rejected') => {
    setMyListings((prev) =>
      prev.map((l) => {
        if (l.id !== listingId) return l;
        const updatedRequests = l.requests.map((r) => r.id === requestId ? { ...r, status } : r);
        // Si aceptado, rechazar las otras pendientes
        const finalRequests = status === 'accepted'
          ? updatedRequests.map((r) => r.status === 'pending' ? { ...r, status: 'rejected' as const } : r)
          : updatedRequests;
        return { ...l, status: status === 'accepted' ? 'exchanged' as const : l.status, requests: finalRequests };
      })
    );
    if (status === 'accepted') fetchListings();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-mono text-xl font-bold text-foreground">Intercambiar libros</h3>
          <p className="text-sm text-muted-foreground mt-1">Ofrecé libros que ya leíste y encontrá tu próxima lectura.</p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowForm((v) => !v); setView('explore'); }}
          className="flex-shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Publicar libro
        </Button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <NewListingForm token={token} onCreated={handleCreated} onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* Subtabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {(['explore', 'mine'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => handleViewChange(v)}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-mono font-medium transition-colors',
              view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {v === 'explore' ? 'Explorar' : `Mis publicaciones${myListings.length > 0 ? ` (${myListings.length})` : ''}`}
          </button>
        ))}
        <button
          onClick={view === 'explore' ? fetchListings : fetchMyListings}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Contenido */}
      {view === 'explore' ? (
        <ExploreView
          token={token}
          listings={listings}
          loading={loadingExplore}
          onRequest={handleRequest}
          requestingId={requestingId}
        />
      ) : (
        <MyListingsView
          token={token}
          listings={myListings}
          loading={loadingMine}
          onDeleted={handleDeleted}
          onResponded={handleResponded}
        />
      )}
    </div>
  );
};

export default ExchangeTab;
