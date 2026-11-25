import React, { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { giftAPI } from '@/utils/api';
import { storyHeading } from '@/lib/gift-test';
import type { GiftBook } from '@/lib/gift-contract';

interface GiftStoryShareProps {
  books: GiftBook[];
  relationship: string;
}

type Status = 'idle' | 'busy' | 'error';

const ERROR_MESSAGE = 'No pudimos preparar la placa. Probá de nuevo.';

const ShareIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F2D661"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12" />
    <path d="M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

const GiftStoryShare: React.FC<GiftStoryShareProps> = ({ books, relationship }) => {
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  const previousStatus = useRef<Status>('idle');
  const groupId = useId();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (previousStatus.current === 'busy' && status !== 'busy') buttonRef.current?.focus();
    previousStatus.current = status;
  }, [status]);

  const book = books[selected] ?? books[0];

  const handleShare = async () => {
    if (status === 'busy' || !book) return;
    setStatus('busy');
    try {
      const story = await import('@/lib/gift-story');
      const [cover] = await Promise.all([
        book.coverUrl ? giftAPI.getCover(book.id) : Promise.resolve(null),
        story.waitForStoryFonts(),
      ]);
      const blob = await story.renderGiftStory({
        heading: storyHeading(relationship),
        book: { title: book.title, author: book.author, coverColor: book.coverColor, shareQuote: book.shareQuote },
        cover,
      });
      await story.shareGiftStory(blob);
      if (mountedRef.current) setStatus('idle');
    } catch {
      if (mountedRef.current) setStatus('error');
    }
  };

  const busy = status === 'busy';

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="label-mono mb-2 text-forest">Libro para la placa</legend>
        {books.map((candidate, index) => {
          const inputId = `${groupId}-${index}`;
          return (
            <label key={`${candidate.id}-${index}`} htmlFor={inputId} className="flex items-center gap-2 font-serif text-base text-wood-dark">
              <input
                id={inputId}
                type="radio"
                name="gift-story-book"
                value={index}
                checked={selected === index}
                onChange={() => setSelected(index)}
                disabled={busy}
                className="accent-forest"
              />
              <span className="break-words">{candidate.title}</span>
            </label>
          );
        })}
      </fieldset>
      <Button
        ref={buttonRef}
        type="button"
        size="lg"
        className="w-full"
        onClick={handleShare}
        disabled={busy}
        aria-busy={busy}
      >
        <ShareIcon />
        {busy ? 'Preparando tu placa…' : 'Compartir en historias'}
      </Button>
      {status === 'error' && (
        <p role="alert" className="font-serif text-sm text-terracotta">
          {ERROR_MESSAGE}
        </p>
      )}
    </div>
  );
};

export default GiftStoryShare;
