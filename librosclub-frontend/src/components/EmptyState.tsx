import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No se encontraron libros',
  description = 'Probá con otra búsqueda o explorá el feed.',
  icon,
}) => {
  return (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
        {icon || <BookOpen className="h-10 w-10 text-muted-foreground/50" />}
      </div>
      <h3 className="font-serif text-xl text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">{description}</p>
    </motion.div>
  );
};

export default EmptyState;
