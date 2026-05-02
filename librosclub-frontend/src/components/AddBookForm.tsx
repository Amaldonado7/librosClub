import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { booksAPI } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface AddBookFormProps {
  token: string;
  onBookAdded: () => void;
}

const AddBookForm: React.FC<AddBookFormProps> = ({ token, onBookAdded }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      toast({ title: 'Campos requeridos', description: 'Título y autor son obligatorios.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await booksAPI.createBook(token, { title, author, genre: genre || undefined });
      toast({ title: 'Libro agregado', description: 'El libro fue agregado correctamente.' });
      setTitle('');
      setAuthor('');
      setGenre('');
      onBookAdded();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6 shadow-card"
    >
      <h3 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
        <Plus className="h-5 w-5 text-accent" />
        Agregar nuevo libro
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Título *</Label>
            <Input placeholder="Título del libro" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Autor *</Label>
            <Input placeholder="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Género</Label>
            <Input placeholder="Género (opcional)" value={genre} onChange={(e) => setGenre(e.target.value)} className="bg-background" />
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Agregando...' : 'Agregar libro'}
        </Button>
      </form>
    </motion.div>
  );
};

export default AddBookForm;
