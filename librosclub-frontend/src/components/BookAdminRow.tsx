import React, { useState } from 'react';
import { Book, booksAPI } from '../utils/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import CoverArt from './brand/CoverArt';

interface BookAdminRowProps {
  book: Book;
  token: string;
  onUpdated: (book: Book) => void;
  onDeleted: (id: string) => void;
}

const BookAdminRow: React.FC<BookAdminRowProps> = ({ book, token, onUpdated, onDeleted }) => {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [genre, setGenre] = useState(book.genre ?? '');
  const [coverUrl, setCoverUrl] = useState(book.coverUrl ?? '');
  const [description, setDescription] = useState(book.description ?? '');

  const { toast } = useToast();

  const handleEdit = () => {
    setTitle(book.title);
    setAuthor(book.author);
    setGenre(book.genre ?? '');
    setCoverUrl(book.coverUrl ?? '');
    setDescription(book.description ?? '');
    setEditing(true);
    setConfirming(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setConfirming(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !author.trim()) {
      toast({ title: 'Campos requeridos', description: 'Título y autor son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updated = await booksAPI.updateBook(token, book.id, {
        title: title.trim(),
        author: author.trim(),
        genre: genre.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        description: description.trim() || undefined,
      });
      onUpdated(updated);
      setEditing(false);
      toast({ title: 'Guardado', description: `"${updated.title}" fue actualizado.` });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await booksAPI.deleteBook(token, book.id);
      onDeleted(book.id);
      toast({ title: 'Eliminado', description: `"${book.title}" fue eliminado del catálogo.` });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  const previewUrl = editing ? coverUrl : book.coverUrl;
  const iconButton =
    'inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-surface disabled:opacity-50';

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 transition-colors',
        editing
          ? 'bg-warm-cream'
          : confirming
            ? 'bg-destructive/10 border-l-4 border-destructive'
            : 'bg-surface hover:bg-warm-cream/60'
      )}
    >
      <CoverArt src={previewUrl || null} title={book.title} size="thumb" />

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                aria-label="Título"
              />
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Autor"
                aria-label="Autor"
              />
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Género (opcional)"
                aria-label="Género (opcional)"
              />
              <Input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="URL de portada (opcional)"
                aria-label="URL de portada (opcional)"
              />
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción / condición del ejemplar"
              aria-label="Descripción / condición del ejemplar"
              className="resize-none h-16 min-h-16"
            />
          </div>
        ) : (
          <div>
            <p className="font-serif text-[17px] text-forest truncate">{book.title}</p>
            <p className="text-sm text-ink-muted mt-0.5 truncate">{book.author}</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {book.type && (
                <span className={cn('pill', book.type === 'intercambio' ? 'pill-sun' : 'pill-forest')}>
                  {book.type === 'venta' ? 'En venta' : 'Para intercambio'}
                </span>
              )}
              {book.genre && (
                <span className="pill pill-outline text-ink-muted">{book.genre}</span>
              )}
            </div>
            {book.type === 'intercambio' && book.description && (
              <p className="font-serif text-sm text-ink-muted mt-1.5 italic line-clamp-2">"{book.description}"</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={saving} aria-label="Guardar">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              aria-label="Cancelar"
              className={cn(iconButton, 'text-ink-muted hover:text-forest')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : confirming ? (
          <>
            <span className="label-mono text-destructive">¿Eliminar?</span>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '...' : 'Sí'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
              No
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleEdit}
              aria-label="Editar"
              className={cn(iconButton, 'text-ink-muted hover:text-forest')}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Eliminar"
              className={cn(iconButton, 'text-ink-muted hover:text-destructive')}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookAdminRow;
