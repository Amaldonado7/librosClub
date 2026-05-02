import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export interface BookCoverCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'accent';
  thumbnail?: string | null;
  link?: string | null;
  index?: number;
}

const BookCoverCard: React.FC<BookCoverCardProps> = ({
  title,
  subtitle,
  badge,
  badgeVariant = 'accent',
  thumbnail,
  link,
  index = 0,
}) => {
  const badgeClass =
    badgeVariant === 'primary'
      ? 'bg-primary/90 text-primary-foreground'
      : 'bg-accent text-accent-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.4) }}
      className="group bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-warm transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3 text-center bg-gradient-to-br from-secondary to-muted">
            <BookOpen className="h-7 w-7 text-primary/40" />
            <p className="text-xs text-muted-foreground/60 font-mono line-clamp-3 leading-snug">
              {title}
            </p>
          </div>
        )}
        {badge && (
          <span className={`absolute top-2 left-2 text-xs font-mono font-bold px-2 py-0.5 rounded-md ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="p-3 space-y-1">
        <p className="font-mono text-xs font-bold leading-snug line-clamp-2 text-foreground">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-primary font-medium hover:underline pt-1"
          >
            Ver más →
          </a>
        )}
      </div>
    </motion.div>
  );
};

export default BookCoverCard;
