import React, { useState } from 'react';
import { Book, booksAPI } from '../utils/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Pencil, Trash2, Check, X, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [imgError, setImgError] = useState(false);

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
    setImgError(false);
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  const previewUrl = editing ? coverUrl : book.coverUrl;
  const showPreview = previewUrl && !imgError;

  return (
    <div className="flex items-start gap-4 p-4 bg-card border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-[68px] rounded-md border border-border overflow-hidden bg-muted flex items-center justify-center">
        {showPreview ? (
          <img
            src={previewUrl!}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : imgError ? (
          <ImageOff className="h-4 w-4 text-muted-foreground/40" />
        ) : (
          <BookOpen className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                className="bg-background text-sm h-8"
              />
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Autor"
                className="bg-background text-sm h-8"
              />
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Género (opcional)"
                className="bg-background text-sm h-8"
              />
              <Input
                value={coverUrl}
                onChange={(e) => { setCoverUrl(e.target.value); setImgError(false); }}
                placeholder="URL de portada (opcional)"
                className="bg-background text-sm h-8"
              />
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción / condición del ejemplar"
              className="bg-background text-sm resize-none h-16"
            />
          </div>
        ) : (
          <div>
            <p className="font-mono text-sm font-bold text-foreground truncate">{book.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {book.type && (
                <span className={cn(
                  'inline-block text-xs font-mono px-2 py-0.5 rounded-md',
                  book.type === 'intercambio'
                    ? 'bg-accent/20 text-accent-foreground'
                    : 'bg-primary/10 text-primary'
                )}>
                  {book.type === 'venta' ? 'En venta' : 'Para intercambio'}
                </span>
              )}
              {book.genre && (
                <span className="inline-block text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                  {book.genre}
                </span>
              )}
            </div>
            {book.type === 'intercambio' && book.description && (
              <p className="text-xs text-muted-foreground/70 mt-1.5 italic line-clamp-2">"{book.description}"</p>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="h-3.5 w-3.5 mr-1" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving} className="h-8 px-3">
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : confirming ? (
          <>
            <span className="text-xs text-destructive font-mono">¿Eliminar?</span>
            <Button size="sm" onClick={handleDelete} disabled={deleting} className="h-8 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? '...' : 'Sí'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={deleting} className="h-8 px-3">
              No
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={handleEdit} className="h-8 px-3 text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} className="h-8 px-3 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookAdminRow;
