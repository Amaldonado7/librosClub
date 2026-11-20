import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { coverPaletteFor } from '@/lib/cover-palette';

export type CoverArtSize = 'card' | 'thumb';

export interface CoverArtProps {
  src?: string | null;
  title: string;
  subtitle?: string;
  size?: CoverArtSize;
  className?: string;
  children?: React.ReactNode;
}

const SIZE_CLASSES: Record<CoverArtSize, string> = {
  card: 'w-full aspect-[2/3]',
  thumb: 'w-10 h-14 shrink-0',
};

const CoverArt: React.FC<CoverArtProps> = ({
  src,
  title,
  subtitle,
  size = 'card',
  className,
  children,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !imgFailed;
  const palette = coverPaletteFor(title);
  const isThumbFallback = size === 'thumb' && !showImage;

  return (
    <div
      className={cn('cover-spine', SIZE_CLASSES[size], className)}
      role={isThumbFallback ? 'img' : undefined}
      aria-label={isThumbFallback ? title : undefined}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : size === 'thumb' ? (
        <div
          className="flex h-full w-full items-center justify-center font-serif text-lg"
          style={{ backgroundColor: palette.bg, color: palette.fg }}
        >
          <span aria-hidden="true">{title.trim().charAt(0).toUpperCase()}</span>
        </div>
      ) : (
        <div
          className="flex h-full w-full flex-col justify-end gap-1.5"
          style={{ backgroundColor: palette.bg, color: palette.fg, padding: '18px 14px 14px 22px' }}
        >
          <p className="font-serif text-[20px] leading-tight line-clamp-4">{title}</p>
          {subtitle && <p className="font-serif italic text-sm line-clamp-2">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default CoverArt;
