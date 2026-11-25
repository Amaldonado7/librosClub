import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, booksAPI, bookRequestsAPI, Book, BookRequest } from '../utils/api';
import RequestChatModal from './RequestChatModal';
import BookCoverCard from './BookCoverCard';
import BookAdminRow from './BookAdminRow';
import LibrosDisponiblesTab from './LibrosDisponiblesTab';
import ClubesTab from './ClubesTab';
import CercaTuyoTab from './CercaTuyoTab';
import EmptyState from './EmptyState';
import AddBookForm from './AddBookForm';
import { BooksGridSkeleton } from './BookCardSkeleton';
import FloralSeal from './brand/FloralSeal';
import CoverArt from './brand/CoverArt';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  LogOut,
  LogIn,
  UserPlus,
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
  MessageCircle,
  Crown,
  Gift,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import AuthModal from './AuthModal';
import PremiumUpgradeModal from './PremiumUpgradeModal';

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

const RATE_LIMITED_MESSAGE = 'Hiciste muchas búsquedas seguidas. Probá de nuevo en unos minutos.';

const googleBooksErrorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.code === 'rate_limited' ? RATE_LIMITED_MESSAGE : fallback;

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
  const [chatRequest, setChatRequest] = useState<BookRequest | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openAuthModal = (mode: 'login' | 'register' = 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const { token, logout, isPremium } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const decoded = token ? jwtDecode<{ role: string; userId: number; username: string }>(token) : null;
  const isAdmin = decoded?.role === 'admin';

  useEffect(() => {
    loadGoogleFeed({ topic: googleTopic, page: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token && !isAdmin) {
      bookRequestsAPI.getMyRequests(token)
        .then(setMyBookRequests)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // -------- DB calls (para "all" y "search") --------
  const loadAllBooks = async () => {
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
    } catch (err) {
      toast({ title: 'Error', description: googleBooksErrorMessage(err, 'Error en la búsqueda.'), variant: 'destructive' });
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
    } catch (err) {
      toast({
        title: 'Error',
        description: googleBooksErrorMessage(err, 'No se pudo cargar el feed de Google Books.'),
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
      setAdminBookRequests((prev) => {
        const updated = prev.map((r) => r.id === reqId ? { ...r, status } : r);
        if (status === 'accepted') {
          const accepted = prev.find((r) => r.id === reqId);
          if (accepted) {
            return updated.map((r) =>
              r.id !== reqId && r.bookId === accepted.bookId && r.status === 'pending'
                ? { ...r, status: 'rejected' as const }
                : r
            );
          }
        }
        return updated;
      });
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
    if (isMobile) setSidebarOpen(false);

    if ((key === 'all' || key === 'admin') && allBooks.length === 0) loadAllBooks();
    if (key === 'admin' && adminBookRequests.length === 0) loadAdminBookRequests();
    if (key === 'search') setSearchResults([]);
  };

  const handleLogout = () => {
    logout();
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión correctamente.' });
  };

  const ICON_BUTTON =
    'inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-pill text-ink-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-surface disabled:opacity-50';

  const SIDEBAR_ITEM =
    'w-full min-h-11 px-3 rounded-md flex items-center gap-3 label-mono text-[13px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunlight focus-visible:ring-offset-2 ring-offset-wood-dark';

  const sidebarItemClass = (active: boolean) =>
    cn(SIDEBAR_ITEM, active ? 'bg-forest text-warm-cream' : 'text-sidebar-muted hover:bg-wood-mid');

  const activeTitle =
    activeTab === 'admin' ? 'Gestionar libros' : sidebarItems.find((i) => i.key === activeTab)?.label;
  const activeDescription =
    activeTab === 'admin'
      ? 'Panel de administración'
      : sidebarItems.find((i) => i.key === activeTab)?.description ?? '';

  const renderBookGrid = (books: GoogleBook[]) => (
    <div className="cover-grid">
      {books.map((b, i) => (
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
  );

  const renderGoogleBooks = () => {
    if (isGoogleLoading) return <BooksGridSkeleton />;

    if (googleBooks.length === 0) {
      return (
        <EmptyState
          title="No se encontraron libros"
          description="Probá con otra temática."
          icon={<Rss className="h-8 w-8" />}
        />
      );
    }

    return (
      <div className="flex flex-col gap-8">
        {renderBookGrid(googleBooks)}

        {hasMore && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => loadGoogleFeed({ topic: googleTopic, page: googlePage + 1, append: true })}
              disabled={isLoadingMore}
              className="min-w-36"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-2">
              <p className="accent-hand text-base md:text-lg text-terracotta">olor a libro nuevo</p>
              <h2 className="font-serif font-normal text-[36px] md:text-[42px] leading-[1.05] text-forest">
                Explorá libros
              </h2>
              <p className="font-serif text-[19px] text-ink-muted">
                Seleccioná un género para descubrir lecturas.
              </p>
            </div>

            <div
              role="group"
              aria-label="Géneros"
              className="-mx-5 flex flex-nowrap gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
            >
              {GENRES.map((g) => {
                const active = googleTopic === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleTopicChange(g.key)}
                    className={cn('chip shrink-0 px-4 md:px-[18px]', active ? 'chip-on' : 'chip-off')}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            {renderGoogleBooks()}
          </div>
        );

      case 'search':
        return (
          <div className="flex flex-col gap-7">
            <h2 className="font-serif font-normal text-[36px] md:text-[42px] leading-[1.05] text-forest">
              Encontrá tu próxima lectura
            </h2>

            <form
              className="flex gap-2 max-w-lg"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }}
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  placeholder="Título, autor, saga o ISBN..."
                  aria-label="Título, autor, saga o ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <Button type="submit" size="icon" disabled={isSearching || !searchQuery.trim()} aria-label="Buscar">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </form>

            {isSearching ? (
              <BooksGridSkeleton />
            ) : searchResults.length > 0 ? (
              renderBookGrid(searchResults)
            ) : searchQuery && !isSearching ? (
              <EmptyState
                title="Sin resultados"
                description="Probá con otro título o autor."
                icon={<Search className="h-8 w-8" />}
              />
            ) : (
              <EmptyState
                title="¿Qué querés leer?"
                description="Título, autor, saga o ISBN."
                icon={<Search className="h-8 w-8" />}
              />
            )}
          </div>
        );

      case 'all':
        return (
          <LibrosDisponiblesTab
            token={token}
            allBooks={allBooks}
            isLoadingBooks={isLoading}
            isAdmin={isAdmin}
            onGoToAdmin={() => handleTabChange('admin')}
            myRequests={myRequestsMap}
            onRequested={handleBookRequested}
            onAuthRequired={() => openAuthModal('register')}
          />
        );

      case 'admin':
        return (
          <div className="flex flex-col gap-6">
            <div className="flex gap-1 border-b-[1.5px] border-line">
              {([
                { key: 'catalogo' as const, label: 'Catálogo' },
                { key: 'solicitudes' as const, label: 'Solicitudes' },
              ]).map((t) => {
                const pendingCount = t.key === 'solicitudes'
                  ? adminBookRequests.filter((r) => r.status === 'pending').length
                  : 0;
                const active = adminTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAdminTab(t.key)}
                    className={cn(
                      'label-mono relative -mb-[1.5px] inline-flex min-h-11 items-center gap-1.5 px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      active ? 'text-forest border-b-2 border-forest' : 'text-ink-muted hover:text-forest'
                    )}
                  >
                    {t.label}
                    {pendingCount > 0 && (
                      <span className="pill pill-sun min-w-5 justify-center">{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {adminTab === 'catalogo' ? (
              <div className="flex flex-col gap-5">
                <p className="font-serif text-lg text-ink-muted">Agregá, editá o eliminá libros del catálogo.</p>
                <AddBookForm token={token!} onBookAdded={loadAllBooks} />
                {isLoading ? (
                  <p className="font-serif text-ink-muted px-1">Cargando catálogo...</p>
                ) : allBooks.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="label-mono text-ink-muted px-1">
                      Catálogo — {allBooks.length} {allBooks.length === 1 ? 'libro' : 'libros'}
                    </p>
                    <div className="rounded-lg border-[1.5px] border-line-strong overflow-hidden divide-y divide-line bg-surface">
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-serif text-lg text-ink-muted">Compras e intercambios solicitados por los usuarios.</p>
                  <button
                    type="button"
                    onClick={loadAdminBookRequests}
                    className={cn(ICON_BUTTON, 'hover:text-forest')}
                    title="Actualizar"
                    aria-label="Actualizar"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingBookRequests ? 'animate-spin' : ''}`} aria-hidden="true" />
                  </button>
                </div>

                {isLoadingBookRequests ? (
                  <p className="font-serif text-ink-muted px-1">Cargando...</p>
                ) : adminBookRequests.length === 0 ? (
                  <p className="font-serif text-ink-muted px-1">No hay solicitudes.</p>
                ) : (
                  <div className="rounded-lg border-[1.5px] border-line-strong overflow-hidden divide-y divide-line">
                    {adminBookRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3 px-4 py-3 bg-surface">
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-[17px] text-forest truncate">{req.title}</p>
                          <p className="text-sm text-ink-muted truncate">
                            {req.author} · solicitado por <span className="font-medium">{req.requesterUsername}</span>
                          </p>
                        </div>
                        <span className={cn('pill flex-shrink-0', req.type === 'intercambio' ? 'pill-sun' : 'pill-forest')}>
                          {req.type === 'intercambio' ? 'Intercambio' : 'Compra'}
                        </span>
                        {req.status === 'pending' ? (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRespondToRequest(req.id, 'accepted')}
                              disabled={respondingReqId === req.id}
                              className={cn(ICON_BUTTON, 'hover:text-forest')}
                              title="Aceptar"
                              aria-label="Aceptar"
                            >
                              <CheckCircle className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondToRequest(req.id, 'rejected')}
                              disabled={respondingReqId === req.id}
                              className={cn(ICON_BUTTON, 'hover:text-destructive')}
                              title="Rechazar"
                              aria-label="Rechazar"
                            >
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        ) : req.status === 'accepted' ? (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="label-mono flex items-center gap-1 text-forest">
                              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Aceptada
                            </span>
                            <button
                              type="button"
                              onClick={() => setChatRequest(req)}
                              className={cn(ICON_BUTTON, 'hover:text-terracotta')}
                              title="Abrir chat"
                              aria-label="Abrir chat"
                            >
                              <MessageCircle className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <span className="label-mono flex items-center gap-1 flex-shrink-0 text-ink-muted">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Rechazada
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
        return <ClubesTab token={token} isAdmin={isAdmin} userId={decoded?.userId ?? 0} onAuthRequired={() => openAuthModal('register')} />;

      case 'nearby':
        return <CercaTuyoTab token={token} />;

      default:
        return null;
    }
  };

  const menuButton = (
    <button
      type="button"
      onClick={() => setSidebarOpen(!sidebarOpen)}
      aria-label="Abrir o cerrar menú"
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isMobile
          ? 'border-sidebar-muted text-warm-cream hover:bg-wood-mid focus-visible:ring-sunlight ring-offset-wood-dark'
          : 'border-forest text-forest hover:bg-forest hover:text-warm-cream focus-visible:ring-ring ring-offset-warm-cream'
      )}
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-wood-dark/60"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              'bg-wood-dark px-4 py-6 flex flex-col gap-8 overflow-y-auto overflow-x-hidden flex-shrink-0',
              isMobile && 'fixed inset-y-0 left-0 z-50 h-screen'
            )}
          >
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-h-11 flex items-center gap-3 rounded-md px-1 text-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunlight focus-visible:ring-offset-2 ring-offset-wood-dark"
            >
              <FloralSeal size={32} centerColor="#492710" />
              <span className="font-mono text-sm font-semibold uppercase tracking-[0.16em]">LibrosClub</span>
            </button>

            <nav aria-label="Secciones" className="flex-1 flex flex-col gap-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleTabChange(item.key)}
                    aria-current={active ? 'page' : undefined}
                    className={sidebarItemClass(active)}
                  >
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-sunlight')} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <Link to="/regalo" className={sidebarItemClass(false)}>
                <Gift className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span>Regalá un libro</span>
              </Link>

              {isAdmin && (
                <div className="pt-4 mt-4 border-t-[1.5px] border-wood-mid flex flex-col gap-2">
                  <p className="px-3 label-mono text-sidebar-muted">Admin</p>
                  <button
                    type="button"
                    onClick={() => handleTabChange('admin')}
                    aria-current={activeTab === 'admin' ? 'page' : undefined}
                    className={sidebarItemClass(activeTab === 'admin')}
                  >
                    <Settings
                      className={cn('h-[18px] w-[18px] shrink-0', activeTab === 'admin' && 'text-sunlight')}
                      aria-hidden="true"
                    />
                    <span>Gestionar libros</span>
                  </button>
                </div>
              )}
            </nav>

            <div className="bg-wood-mid rounded-lg p-4 flex flex-col gap-3">
              {token ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-lg text-warm-cream truncate flex-1">{decoded?.username}</p>
                    {isPremium ? (
                      <span className="pill pill-sun gap-1 flex-shrink-0">
                        <Crown className="h-3 w-3" aria-hidden="true" />
                        Pro
                      </span>
                    ) : (
                      <span className="pill pill-outline text-sidebar-muted flex-shrink-0">Free</span>
                    )}
                  </div>
                  {!isPremium && (
                    <Button
                      onClick={() => setUpgradeModalOpen(true)}
                      variant="sun"
                      className="w-full focus-visible:ring-sunlight ring-offset-wood-mid"
                    >
                      <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                      Activar Premium
                    </Button>
                  )}
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start text-sidebar-muted hover:bg-wood-dark hover:text-warm-cream focus-visible:ring-sunlight ring-offset-wood-mid"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={() => openAuthModal('login')}
                    variant="ghost"
                    className="w-full justify-start text-sidebar-muted hover:bg-wood-dark hover:text-warm-cream focus-visible:ring-sunlight ring-offset-wood-mid"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Iniciar sesión
                  </Button>
                  <Button
                    onClick={() => openAuthModal('register')}
                    variant="ghost"
                    className="w-full justify-start text-sidebar-muted hover:bg-wood-dark hover:text-warm-cream focus-visible:ring-sunlight ring-offset-wood-mid"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Registrarse
                  </Button>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {isMobile ? (
          <header className="bg-wood-dark text-warm-cream px-4 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
            {menuButton}
            <div className="flex items-center gap-2 min-w-0">
              <FloralSeal size={24} centerColor="#492710" />
              <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em]">LibrosClub</span>
            </div>
            {isAdmin ? (
              <span className="pill pill-forest flex-shrink-0">Admin</span>
            ) : (
              <span className="w-11 flex-shrink-0" aria-hidden="true" />
            )}
          </header>
        ) : (
          <header className="px-10 py-5 border-b-[1.5px] border-line bg-warm-cream flex items-center gap-4 flex-shrink-0">
            {menuButton}
            <div className="flex-1 min-w-0">
              <h1 className="font-serif font-normal text-[30px] leading-tight text-forest">{activeTitle}</h1>
              <p className="label-mono text-ink-muted tracking-[0.1em]">{activeDescription}</p>
            </div>
            {isAdmin && <span className="pill pill-forest">Admin</span>}
          </header>
        )}

        <main className="flex-1 p-5 md:p-10 flex flex-col gap-7 overflow-y-auto">
          {isMobile && (
            <div className="flex flex-col gap-1">
              <h1 className="font-serif font-normal text-[30px] leading-tight text-forest">{activeTitle}</h1>
              <p className="label-mono text-ink-muted tracking-[0.1em]">{activeDescription}</p>
            </div>
          )}

          {!isAdmin && activeTab === 'all' && myBookRequests.some((r) => r.status !== 'pending') && (
            <div className="flex flex-col gap-3">
              <p className="label-mono text-ink-muted">Tus solicitudes</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-3">
                {myBookRequests
                  .filter((r) => r.status !== 'pending')
                  .map((req) => (
                    <div key={req.id} className="card-surface flex items-center gap-3 px-4 py-3">
                      <CoverArt src={req.coverUrl} title={req.title ?? 'Libro'} size="thumb" />
                      <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                        <p className="font-serif text-[17px] text-forest truncate max-w-full">{req.title ?? 'Libro'}</p>
                        <p className="label-mono text-ink-muted">
                          {req.type === 'intercambio' ? 'Intercambio' : 'Compra'}
                        </p>
                        <span className={cn('pill gap-1', req.status === 'accepted' ? 'pill-forest' : 'pill-outline text-destructive')}>
                          {req.status === 'accepted'
                            ? <><CheckCircle className="h-3 w-3" aria-hidden="true" /> Aceptado</>
                            : <><XCircle className="h-3 w-3" aria-hidden="true" /> Rechazado</>
                          }
                        </span>
                        {req.status === 'accepted' && (
                          <Button
                            variant="link"
                            onClick={() => setChatRequest(req)}
                            className="h-auto min-h-11 md:min-h-0 px-0 gap-1"
                          >
                            <MessageCircle className="h-3 w-3" aria-hidden="true" /> Coordinar
                          </Button>
                        )}
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
              className="flex flex-col gap-7"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
      {upgradeModalOpen && <PremiumUpgradeModal onClose={() => setUpgradeModalOpen(false)} />}
      {chatRequest && token && decoded && (
        <RequestChatModal
          requestId={chatRequest.id}
          token={token}
          currentUserId={decoded.userId}
          bookTitle={chatRequest.title ?? 'Libro'}
          requesterUsername={isAdmin ? chatRequest.requesterUsername : undefined}
          onClose={() => setChatRequest(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
