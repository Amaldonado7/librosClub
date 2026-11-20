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
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forest mb-4">
        <span className="inline-flex text-sunlight [&_svg]:text-sunlight" aria-hidden="true">
          {icon || <BookOpen className="h-8 w-8" />}
        </span>
      </div>
      <h3 className="font-serif text-[27px] text-forest font-normal mb-2">{title}</h3>
      <p className="font-serif text-lg text-ink-muted max-w-sm mx-auto">{description}</p>
    </motion.div>
  );
};

export default EmptyState;
