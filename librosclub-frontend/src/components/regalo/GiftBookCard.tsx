import React, { useEffect, useRef, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import CoverArt from '@/components/brand/CoverArt';
import { cn } from '@/lib/utils';
import type { GiftBook } from '@/lib/gift-contract';

interface GiftBookCardProps {
  book: GiftBook;
}

const COPIED_FEEDBACK_MS = 2000;

const canCopyToClipboard = () =>
  typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

const GiftBookCard: React.FC<GiftBookCardProps> = ({ book }) => {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const copyDedication = async () => {
    try {
      await navigator.clipboard.writeText(book.dedication);
    } catch {
      return;
    }
    if (!mounted.current) return;
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <article className="card-surface flex flex-col gap-4 p-4">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
        <CoverArt src={book.coverUrl} title={book.title} fallbackColor={book.coverColor} />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <span className="pill pill-outline break-words">{book.genreLabel}</span>
          <h3 className="font-serif text-xl font-normal leading-tight break-words">{book.title}</h3>
          <p className="font-serif italic break-words">{book.author}</p>
        </div>
      </div>

      <p className="font-serif leading-relaxed break-words">{book.why}</p>

      <div className="flex flex-col gap-2 rounded-btn border-[1.5px] border-line bg-background p-3">
        <p className="label-mono">Dedicatoria sugerida</p>
        <p className="font-serif italic leading-relaxed break-words">{book.dedication}</p>
        {canCopyToClipboard() && (
          <Button variant="outline" className="self-start" onClick={copyDedication}>
            <span aria-live="polite">{copied ? '¡Copiada!' : 'Copiar dedicatoria'}</span>
          </Button>
        )}
      </div>

      {book.buyUrl && (
        <a
          href={book.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'accent' }), 'min-h-11 self-start')}
        >
          Comprar
        </a>
      )}
    </article>
  );
};

export default GiftBookCard;
