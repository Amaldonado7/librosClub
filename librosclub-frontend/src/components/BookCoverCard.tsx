import React from 'react';
import { motion } from 'framer-motion';
import CoverArt from './brand/CoverArt';
import { safeExternalUrl } from '@/lib/safe-url';

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
  const badgeClass = badgeVariant === 'primary' ? 'pill-forest' : 'pill-sun';
  const safeLink = safeExternalUrl(link);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.4) }}
      className="group flex min-w-0 flex-col gap-3 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <CoverArt src={thumbnail} title={title} subtitle={subtitle} size="card">
        {badge && (
          <span className={`pill ${badgeClass} absolute top-3 left-[22px] z-10`}>{badge}</span>
        )}
      </CoverArt>

      <div className="flex flex-col gap-1">
        <p className="font-serif text-[19px] leading-snug text-forest line-clamp-2">{title}</p>
        {subtitle && <p className="font-serif italic text-base text-ink-muted line-clamp-1">{subtitle}</p>}
        {safeLink && (
          <a
            href={safeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 md:min-h-8 items-center self-start rounded-btn font-mono text-xs uppercase tracking-[0.08em] text-terracotta hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            Ver más →
          </a>
        )}
      </div>
    </motion.div>
  );
};

export default BookCoverCard;
