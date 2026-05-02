import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { booksAPI, Book } from '../utils/api';
import BookCard from './BookCard';
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
  ArrowLeftRight,
  Users,
  MapPin,
  Menu,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type TabKey = 'feed' | 'search' | 'all' | 'exchange' | 'clubs' | 'nearby';

const sidebarItems: { key: TabKey; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'feed', label: 'Feed', icon: Rss, description: 'Novedades y recomendaciones' },
  { key: 'search', label: 'Buscar', icon: Search, description: 'Encontrá libros' },
  { key: 'all', label: 'Todos', icon: Library, description: 'Catálogo completo' },
  { key: 'exchange', label: 'Intercambiar', icon: ArrowLeftRight, description: 'Intercambiá con otros' },
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
  // DB (se mantiene para tabs all/search)
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Loading general (DB)
  const [isLoading, setIsLoading] = useState(false);

  // Feed ahora es Google Books
  const [googleBooks, setGoogleBooks] = useState<GoogleBook[]>([]);
  const [googleTopic, setGoogleTopic] = useState('fiction');
  const [googlePage, setGooglePage] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { token, logout } = useAuth();
  const { toast } = useToast();

  const decoded = token ? jwtDecode<{ role: string }>(token) : null;
  const isAdmin = decoded?.role === 'admin';

  useEffect(() => {
    if (token) {
      // Feed inicial (Google)
      loadGoogleFeed({ topic: googleTopic, page: 0 });
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
    if (!token || !query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const books = await booksAPI.searchBooks(token, query);
      setSearchResults(books);
    } catch {
      toast({ title: 'Error', description: 'Error en la búsqueda de libros.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
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

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);

    // si entro a "all" la primera vez, cargo DB
    if (key === 'all' && allBooks.length === 0) loadAllBooks();

    if (key === 'search') setSearchResults([]);

    // opcional: refrescar feed cada vez que vuelvo
    // if (key === 'feed') loadGoogleFeed({ topic: googleTopic, page: googlePage });
  };

  const handleLogout = () => {
    logout();
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión correctamente.' });
  };

  // -------- Render helpers --------
  const renderDbBooks = (books: Book[]) => {
    if (isLoading) return <BooksGridSkeleton />;
    if (books.length === 0) return <EmptyState />;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {books.map((book, i) => (
          <BookCard key={book.id} book={book} index={i} />
        ))}
      </div>
    );
  };

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
            <motion.div
              key={`${b.id}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4) }}
              className="group bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-warm transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="relative aspect-[2/3] bg-muted overflow-hidden">
                {b.thumbnail ? (
                  <img
                    src={b.thumbnail}
                    alt={b.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3 text-center">
                    <BookOpen className="h-7 w-7 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground/60 font-mono line-clamp-3 leading-snug">
                      {b.title}
                    </p>
                  </div>
                )}
                {b.publishedDate && (
                  <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                    {b.publishedDate.slice(0, 4)}
                  </span>
                )}
              </div>

              <div className="p-3 space-y-1">
                <p className="font-mono text-xs font-bold leading-snug line-clamp-2 text-foreground">
                  {b.title}
                </p>
                {b.authors?.length ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {b.authors.join(', ')}
                  </p>
                ) : null}
                {b.link ? (
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-primary font-medium hover:underline pt-1"
                  >
                    Ver más →
                  </a>
                ) : null}
              </div>
            </motion.div>
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
          <div className="space-y-6">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar libros por título..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="pl-10 bg-card border-border"
              />
            </div>

            {searchQuery ? (
              renderDbBooks(searchResults)
            ) : (
              <EmptyState
                title="Buscá algo"
                description="Escribí el título de un libro para empezar."
                icon={<Search className="h-10 w-10 text-muted-foreground/50" />}
              />
            )}
          </div>
        );

      case 'all':
        return renderDbBooks(allBooks);

      case 'exchange':
        return renderComingSoon(
          'Intercambio de libros',
          'Próximamente: publicá libros para intercambiar con otros lectores de tu zona.',
          <ArrowLeftRight className="h-10 w-10 text-accent/60" />
        );

      case 'clubs':
        return renderComingSoon(
          'Clubes de lectura',
          'Próximamente: creá o unite a clubes de lectura con personas que comparten tus gustos.',
          <Users className="h-10 w-10 text-forest/60" />
        );

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
                    onClick={() => handleTabChange('all')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                  >
                    <BookOpen className="h-4.5 w-4.5" />
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
              {sidebarItems.find((i) => i.key === activeTab)?.label}
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {sidebarItems.find((i) => i.key === activeTab)?.description}
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {isAdmin && activeTab === 'all' && <AddBookForm token={token!} onBookAdded={loadAllBooks} />}
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
