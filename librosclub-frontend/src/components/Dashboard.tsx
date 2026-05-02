import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { booksAPI, bookRequestsAPI, Book, BookRequest } from '../utils/api';
import BookCoverCard from './BookCoverCard';
import BookAdminRow from './BookAdminRow';
import LibrosDisponiblesTab from './LibrosDisponiblesTab';
import ClubesTab from './ClubesTab';
import EmptyState from './EmptyState';
import AddBookForm from './AddBookForm';
import { BooksGridSkeleton } from './BookCardSkeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Search,
  LogOut,
  Rss,
  Library,
  Users,
  MapPin,
  Menu,
  Loader2,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type TabKey = 'feed' | 'search' | 'all' | 'clubs' | 'nearby' | 'admin';

const sidebarItems: { key: TabKey; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'feed', label: 'Feed', icon: Rss, description: 'Novedades y recomendaciones' },
  { key: 'search', label: 'Buscar', icon: Search, description: 'Encontrá libros' },
  { key: 'all', label: 'Libros disponibles', icon: Library, description: 'Catálogo e intercambios' },
  { key: 'clubs', label: 'Clubes', icon: Users, description: 'Clubes de lectura' },
  { key: 'nearby', label: 'Cerca tuyo', icon: MapPin, description: 'Lectores cercanos' },
];

type GoogleBook = {
  id: string;
  title: string;
  authors?: string[];
  publishedDate?: string | null;
  thumbnail?: string | null;
  link?: string | null;
};

const GENRES = [
  { key: 'fiction', label: 'Ficción' },
  { key: 'fantasy', label: 'Fantasía' },
  { key: 'romance', label: 'Romance' },
  { key: 'thriller', label: 'Thriller' },
  { key: 'mystery', label: 'Misterio' },
  { key: 'horror', label: 'Terror' },
  { key: 'history', label: 'Historia' },
  { key: 'biography', label: 'Biografía' },
  { key: 'science', label: 'Ciencia' },
  { key: 'poetry', label: 'Poesía' },
] as const;

const Dashboard: React.FC = () => {
  // DB (solo para tab "all")
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Búsqueda Google Books
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Feed ahora es Google Books
  const [googleBooks, setGoogleBooks] = useState<GoogleBook[]>([]);
  const [googleTopic, setGoogleTopic] = useState('fiction');
  const [googlePage, setGooglePage] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Admin — solicitudes de libros
  const [adminBookRequests, setAdminBookRequests] = useState<BookRequest[]>([]);
  const [isLoadingBookRequests, setIsLoadingBookRequests] = useState(false);
  const [respondingReqId, setRespondingReqId] = useState<number | null>(null);
  const [adminTab, setAdminTab] = useState<'catalogo' | 'solicitudes'>('catalogo');
  const [myBookRequests, setMyBookRequests] = useState<BookRequest[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { token, logout } = useAuth();
  const { toast } = useToast();

  const decoded = token ? jwtDecode<{ role: string; userId: number; username: string }>(token) : null;
  const isAdmin = decoded?.role === 'admin';

  useEffect(() => {
    if (token) {
      loadGoogleFeed({ topic: googleTopic, page: 0 });
      if (!isAdmin) {
        bookRequestsAPI.getMyRequests(token)
          .then(setMyBookRequests)
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // -------- DB calls (para "all" y "search") --------
  const loadAllBooks = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const books = await booksAPI.getAllBooks(token);
      setAllBooks(books);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los libros.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await booksAPI.searchGoogleBooks(query);
      setSearchResults((data?.items ?? []) as GoogleBook[]);
    } catch {
      toast({ title: 'Error', description: 'Error en la búsqueda.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  // -------- Google feed calls (para "feed") --------
  const loadGoogleFeed = async (opts?: { topic?: string; page?: number; append?: boolean }) => {
    const topic = opts?.topic ?? googleTopic;
    const page = opts?.page ?? 0;
    const append = opts?.append ?? false;

    if (append) setIsLoadingMore(true);
    else setIsGoogleLoading(true);

    try {
      const data = await booksAPI.getGoogleFeed(topic, page);
      const newItems = (data?.items ?? []) as GoogleBook[];

      if (append) {
        setGoogleBooks((prev) => [...prev, ...newItems]);
      } else {
        setGoogleBooks(newItems);
      }
      setGooglePage(page);
      setHasMore(newItems.length > 0);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el feed de Google Books.',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleTopicChange = (topic: string) => {
    setGoogleTopic(topic);
    setGoogleBooks([]);
    setHasMore(true);
    loadGoogleFeed({ topic, page: 0 });
  };

  const loadAdminBookRequests = async () => {
    if (!token) return;
    setIsLoadingBookRequests(true);
    try {
      setAdminBookRequests(await bookRequestsAPI.getAdminRequests(token));
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar las solicitudes.', variant: 'destructive' });
    } finally {
      setIsLoadingBookRequests(false);
    }
  };

  const handleRespondToRequest = async (reqId: number, status: 'accepted' | 'rejected') => {
    setRespondingReqId(reqId);
    try {
      await bookRequestsAPI.respond(token!, reqId, status);
      setAdminBookRequests((prev) =>
        prev.map((r) => r.id === reqId ? { ...r, status } : r)
      );
      toast({ title: status === 'accepted' ? 'Solicitud aceptada' : 'Solicitud rechazada' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar la solicitud.', variant: 'destructive' });
    } finally {
      setRespondingReqId(null);
    }
  };

  const handleBookRequested = (req: BookRequest) => {
    setMyBookRequests((prev) => {
      const filtered = prev.filter((r) => r.bookId !== req.bookId);
      return [...filtered, req];
    });
  };

  const myRequestsMap = useMemo(() => {
    const m = new Map<number, BookRequest['status']>();
    myBookRequests.forEach((r) => m.set(r.bookId, r.status));
    return m;
  }, [myBookRequests]);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);

    if ((key === 'all' || key === 'admin') && allBooks.length === 0) loadAllBooks();
    if (key === 'admin' && adminBookRequests.length === 0) loadAdminBookRequests();
    if (key === 'search') setSearchResults([]);
  };

  const handleLogout = () => {
    logout();
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión correctamente.' });
  };

  // -------- Render helpers --------
  const renderGoogleBooks = () => {
    if (isGoogleLoading) return <BooksGridSkeleton />;

    if (googleBooks.length === 0) {
      return (
        <EmptyState
          title="No se encontraron libros"
          description="Probá con otra temática."
          icon={<Rss className="h-10 w-10 text-muted-foreground/50" />}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {googleBooks.map((b, i) => (
            <BookCoverCard
              key={`${b.id}-${i}`}
              title={b.title}
              subtitle={b.authors?.join(', ')}
              badge={b.publishedDate?.slice(0, 4)}
              badgeVariant="accent"
              thumbnail={b.thumbnail}
              link={b.link}
              index={i}
            />
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => loadGoogleFeed({ topic: googleTopic, page: googlePage + 1, append: true })}
              disabled={isLoadingMore}
              className="min-w-36 border-border"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Cargar más'
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderComingSoon = (title: string, description: string, icon: React.ReactNode) => (
    <EmptyState title={title} description={description} icon={icon} />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="font-mono text-xl font-bold text-foreground">Explorá libros</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seleccioná un género para descubrir lecturas.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g.key}
                  onClick={() => handleTopicChange(g.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors',
                    googleTopic === g.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary hover:text-primary'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {renderGoogleBooks()}
          </div>
        );

      case 'search':
        return (
          <div className="space-y-5">
            <h3 className="font-mono text-xl font-bold text-foreground">
              Encontrá tu próxima lectura
            </h3>

            <form
              className="flex gap-2 max-w-lg"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Título, autor, saga o ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border"
                  autoFocus
                />
              </div>
              <Button type="submit" size="icon" disabled={isSearching || !searchQuery.trim()} aria-label="Buscar">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            {isSearching ? (
              <BooksGridSkeleton />
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchResults.map((b, i) => (
                  <BookCoverCard
                    key={`${b.id}-${i}`}
                    title={b.title}
                    subtitle={b.authors?.join(', ')}
                    badge={b.publishedDate?.slice(0, 4)}
                    badgeVariant="accent"
                    thumbnail={b.thumbnail}
                    link={b.link}
                    index={i}
                  />
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <EmptyState
                title="Sin resultados"
                description="Probá con otro título o autor."
                icon={<Search className="h-10 w-10 text-muted-foreground/50" />}
              />
            ) : (
              <EmptyState
                title="¿Qué querés leer?"
                description="Título, autor, saga o ISBN."
                icon={<Search className="h-10 w-10 text-muted-foreground/50" />}
              />
            )}
          </div>
        );

      case 'all':
        return (
          <LibrosDisponiblesTab
            token={token!}
            allBooks={allBooks}
            isLoadingBooks={isLoading}
            isAdmin={isAdmin}
            onGoToAdmin={() => handleTabChange('admin')}
            myRequests={myRequestsMap}
            onRequested={handleBookRequested}
          />
        );

      case 'admin':
        return (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {([
                { key: 'catalogo' as const, label: 'Catálogo' },
                { key: 'solicitudes' as const, label: 'Solicitudes' },
              ]).map((t) => {
                const pendingCount = t.key === 'solicitudes'
                  ? adminBookRequests.filter((r) => r.status === 'pending').length
                  : 0;
                return (
                  <button
                    key={t.key}
                    onClick={() => setAdminTab(t.key)}
                    className={cn(
                      'relative px-4 py-2.5 text-sm font-mono font-medium transition-colors',
                      adminTab === t.key
                        ? 'text-foreground border-b-2 border-primary -mb-px'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t.label}
                    {pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center bg-accent text-accent-foreground text-xs font-bold w-4 h-4 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {adminTab === 'catalogo' ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Agregá, editá o eliminá libros del catálogo.</p>
                <AddBookForm token={token!} onBookAdded={loadAllBooks} />
                {isLoading ? (
                  <div className="text-sm text-muted-foreground px-1">Cargando catálogo...</div>
                ) : allBooks.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                      Catálogo — {allBooks.length} {allBooks.length === 1 ? 'libro' : 'libros'}
                    </p>
                    <div className="rounded-xl border border-border overflow-hidden">
                      {allBooks.map((book) => (
                        <BookAdminRow
                          key={book.id}
                          book={book}
                          token={token!}
                          onUpdated={(updated) =>
                            setAllBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
                          }
                          onDeleted={(id) =>
                            setAllBooks((prev) => prev.filter((b) => b.id !== id))
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Compras e intercambios solicitados por los usuarios.</p>
                  <button
                    onClick={loadAdminBookRequests}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Actualizar"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingBookRequests ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {isLoadingBookRequests ? (
                  <p className="text-sm text-muted-foreground px-1">Cargando...</p>
                ) : adminBookRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1">No hay solicitudes.</p>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {adminBookRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-bold text-foreground truncate">{req.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {req.author} · solicitado por <span className="font-medium">{req.requesterUsername}</span>
                          </p>
                        </div>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-md flex-shrink-0 ${
                          req.type === 'intercambio' ? 'bg-accent/20 text-accent-foreground' : 'bg-primary/10 text-primary'
                        }`}>
                          {req.type === 'intercambio' ? 'Intercambio' : 'Compra'}
                        </span>
                        {req.status === 'pending' ? (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRespondToRequest(req.id, 'accepted')}
                              disabled={respondingReqId === req.id}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                              title="Aceptar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRespondToRequest(req.id, 'rejected')}
                              disabled={respondingReqId === req.id}
                              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                              title="Rechazar"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`flex items-center gap-1 text-xs font-mono flex-shrink-0 ${
                            req.status === 'accepted' ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {req.status === 'accepted'
                              ? <><CheckCircle className="h-3.5 w-3.5" /> Aceptada</>
                              : <><Clock className="h-3.5 w-3.5" /> Rechazada</>
                            }
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'clubs':
        return <ClubesTab token={token!} isAdmin={isAdmin} userId={decoded?.userId ?? 0} />;

      case 'nearby':
        return renderComingSoon(
          'Lectores cerca tuyo',
          'Próximamente: descubrí lectores en tu zona y conectá para intercambiar libros.',
          <MapPin className="h-10 w-10 text-terracotta/60" />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden flex-shrink-0"
          >
            <div className="p-5 flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-sidebar-primary" />
              <span className="font-serif text-xl font-bold text-sidebar-foreground">LibrosClub</span>
            </div>

            <nav className="flex-1 px-3 py-2 space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabChange(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${active ? 'text-sidebar-primary' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-sidebar-border">
                  <p className="px-3 text-xs uppercase tracking-wider text-sidebar-foreground/40 mb-2">Admin</p>
                  <button
                    onClick={() => handleTabChange('admin')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'admin'
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Settings className={`h-4.5 w-4.5 ${activeTab === 'admin' ? 'text-sidebar-primary' : ''}`} />
                    <span>Gestionar libros</span>
                  </button>
                </div>
              )}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              {activeTab === 'admin' ? 'Gestionar libros' : sidebarItems.find((i) => i.key === activeTab)?.label}
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {activeTab === 'admin' ? 'Panel de administración' : sidebarItems.find((i) => i.key === activeTab)?.description ?? ''}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isAdmin && (
              <span className="bg-accent/15 text-accent text-xs font-medium px-2.5 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {!isAdmin && activeTab === 'all' && myBookRequests.some((r) => r.status !== 'pending') && (
            <div className="mb-6">
              <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Tus solicitudes
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {myBookRequests
                  .filter((r) => r.status !== 'pending')
                  .map((req) => (
                    <div
                      key={req.id}
                      className={cn(
                        'flex-shrink-0 flex items-center gap-3 rounded-xl border px-4 py-3 min-w-[200px]',
                        req.status === 'accepted'
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/50 border-border'
                      )}
                    >
                      <div className="w-10 h-14 rounded-md border border-border overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                        {req.coverUrl ? (
                          <img src={req.coverUrl} alt={req.title ?? ''} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs font-bold text-foreground truncate">{req.title ?? 'Libro'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {req.type === 'intercambio' ? 'Intercambio' : 'Compra'}
                        </p>
                        <span className={cn(
                          'mt-1.5 inline-flex items-center gap-1 text-xs font-mono font-medium',
                          req.status === 'accepted' ? 'text-primary' : 'text-destructive'
                        )}>
                          {req.status === 'accepted'
                            ? <><CheckCircle className="h-3 w-3" /> Aceptado</>
                            : <><XCircle className="h-3 w-3" /> Rechazado</>
                          }
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
