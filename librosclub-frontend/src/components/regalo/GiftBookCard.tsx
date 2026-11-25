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
    <article className="card-surface flex flex-col gap-3.5 p-[18px]">
      <div className="flex gap-4">
        <CoverArt size="compact" src={book.coverUrl} title={book.title} fallbackColor={book.coverColor} />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <span className="pill pill-sun break-words">{book.genreLabel}</span>
          <h2 className="font-serif text-[22px] font-normal leading-tight text-forest break-words">{book.title}</h2>
          <p className="font-serif italic break-words">{book.author}</p>
        </div>
      </div>

      <p className="font-serif text-[17px] leading-[1.45] break-words">{book.why}</p>

      <div className="flex flex-col gap-2 rounded-md bg-warm-cream px-3.5 py-3">
        <p className="label-mono text-terracotta">Dedicatoria sugerida</p>
        <p className="accent-hand text-base leading-[1.7] text-forest break-words">{book.dedication}</p>
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
          className={cn(buttonVariants({ variant: 'accent' }), 'min-h-11 h-12 self-end')}
        >
          Comprar
        </a>
      )}
    </article>
  );
};

export default GiftBookCard;
