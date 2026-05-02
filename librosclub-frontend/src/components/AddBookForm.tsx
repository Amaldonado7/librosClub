import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { booksAPI } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BookOpen, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface AddBookFormProps {
  token: string;
  onBookAdded: () => void;
}

const AddBookForm: React.FC<AddBookFormProps> = ({ token, onBookAdded }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCoverUrlChange = (val: string) => {
    setCoverUrl(val);
    setImgError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      toast({ title: 'Campos requeridos', description: 'Título y autor son obligatorios.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await booksAPI.createBook(token, {
        title,
        author,
        genre: genre || undefined,
        coverUrl: coverUrl || undefined,
        type: 'intercambio',
        description: description.trim() || undefined,
      });
      toast({ title: 'Libro agregado', description: `"${title}" fue agregado al catálogo.` });
      setTitle('');
      setAuthor('');
      setGenre('');
      setCoverUrl('');
      setDescription('');
      setImgError(false);
      onBookAdded();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showPreview = coverUrl.trim() !== '' && !imgError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 shadow-card"
    >
      <h3 className="font-mono text-base font-bold text-foreground mb-5 flex items-center gap-2">
        <Plus className="h-4 w-4 text-accent" />
        Agregar nuevo libro
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-6">
          {/* Preview de portada */}
          <div className="flex-shrink-0">
            <div className="w-24 aspect-[2/3] rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
              {showPreview ? (
                <img
                  src={coverUrl}
                  alt="Preview portada"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : imgError ? (
                <div className="flex flex-col items-center gap-1 px-2 text-center">
                  <ImageOff className="h-5 w-5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground/50">URL inválida</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 px-2 text-center">
                  <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground/40">Portada</p>
                </div>
              )}
            </div>
          </div>

          {/* Campos */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-mono">Título *</Label>
                <Input
                  placeholder="Título del libro"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-mono">Autor *</Label>
                <Input
                  placeholder="Nombre del autor"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-mono">Género</Label>
                <Input
                  placeholder="Ficción, Romance..."
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-mono">URL de portada</Label>
                <Input
                  placeholder="https://books.google.com/..."
                  value={coverUrl}
                  onChange={(e) => handleCoverUrlChange(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-mono">Descripción / condición del ejemplar</Label>
              <Textarea
                placeholder="Ej: Excelente estado, sin subrayados. Busco algo de ciencia ficción a cambio."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background text-sm resize-none"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isSubmitting ? 'Agregando...' : 'Agregar libro'}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default AddBookForm;
