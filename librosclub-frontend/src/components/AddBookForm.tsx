import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { booksAPI } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import CoverArt from './brand/CoverArt';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCoverUrlChange = (val: string) => {
    setCoverUrl(val);
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
      onBookAdded();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface p-6"
    >
      <h3 className="font-serif font-normal text-2xl text-forest mb-5 flex items-center gap-2">
        <Plus className="h-5 w-5 text-terracotta" aria-hidden="true" />
        Agregar nuevo libro
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-shrink-0 flex sm:block justify-center">
            <CoverArt
              src={coverUrl.trim() || null}
              title={title || 'Portada'}
              subtitle={author || undefined}
              size="card"
              className="w-32"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input
                  placeholder="Título del libro"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Autor *</Label>
                <Input
                  placeholder="Nombre del autor"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Género</Label>
                <Input
                  placeholder="Ficción, Romance..."
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>URL de portada</Label>
                <Input
                  placeholder="https://books.google.com/..."
                  value={coverUrl}
                  onChange={(e) => handleCoverUrlChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción / condición del ejemplar</Label>
              <Textarea
                placeholder="Ej: Excelente estado, sin subrayados. Busco algo de ciencia ficción a cambio."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
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
