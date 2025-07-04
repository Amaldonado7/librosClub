import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { booksAPI, Book } from '../utils/api';
import BookCard from './BookCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, Heart, LogOut, Rss } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jwtDecode } from 'jwt-decode';

const Dashboard: React.FC = () => {
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [feedBooks, setFeedBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');

  const { token, logout } = useAuth();
  const { toast } = useToast();

  const decoded = token ? jwtDecode<{ role: string }>(token) : null;
  const isAdmin = decoded?.role === 'admin';

  useEffect(() => {
    if (token) {
      loadFeedBooks();
    }
  }, [token]);

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

  const loadFeedBooks = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const books = await booksAPI.getBooksFeed(token);
      setFeedBooks(books);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el feed de libros.', variant: 'destructive' });
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'all' && allBooks.length === 0) {
      loadAllBooks();
    }
  };

  const handleLogout = () => {
    logout();
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión correctamente.' });
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, author, genre }),
      });

      if (!res.ok) throw new Error('Error al agregar libro');

      toast({ title: 'Libro agregado', description: 'El libro fue agregado correctamente' });
      setTitle('');
      setAuthor('');
      setGenre('');
      loadAllBooks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const renderBooks = (books: Book[]) => {
    if (books.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-amber-300 mx-auto mb-4" />
          <p className="text-amber-700 text-lg">No se encontraron libros</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-amber-700" />
              <Heart className="h-6 w-6 text-red-500" />
              <h1 className="text-2xl font-bold text-amber-900">LibrosClub</h1>
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-amber-900 mb-2">Descubre tu próxima lectura</h2>
          <p className="text-amber-700">Explora nuestra colección de libros y encuentra historias increíbles</p>
        </div>

        {isAdmin && (
          <div className="mb-8 p-6 bg-white rounded-md shadow border border-amber-100">
            <h3 className="text-xl font-semibold text-amber-900 mb-4">Agregar nuevo libro</h3>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} />
              <Input placeholder="Género" value={genre} onChange={(e) => setGenre(e.target.value)} />
              <Button type="submit" className="md:col-span-3 bg-amber-700 hover:bg-amber-800 text-white">
                Agregar libro
              </Button>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600" />
            <Input
              type="text"
              placeholder="Buscar libros por título..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="pl-10 pr-4 border-amber-200 focus:border-amber-400 bg-white/80"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-white/80">
            <TabsTrigger value="feed" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900">
              <Rss className="h-4 w-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900">
              <Search className="h-4 w-4 mr-2" />
              Búsqueda
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900">
              <BookOpen className="h-4 w-4 mr-2" />
              Todos
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="feed">{renderBooks(feedBooks)}</TabsContent>
            <TabsContent value="search">{renderBooks(searchResults)}</TabsContent>
            <TabsContent value="all">{renderBooks(allBooks)}</TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
