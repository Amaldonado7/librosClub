import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { GiftResponse } from '@/lib/gift-contract';
import { recipientFor, resultHeading } from '@/lib/gift-test';
import GiftBookCard from './GiftBookCard';

interface GiftResultProps {
  result: GiftResponse;
  onRestart: () => void;
}

const GiftResult: React.FC<GiftResultProps> = ({ result, onRestart }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="flex flex-col">
      <header className="flex flex-col gap-3 bg-forest px-6 pt-12 pb-9 text-warm-cream">
        <p className="label-mono break-words">{resultHeading(result.profile)}</p>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-serif text-[34px] font-normal leading-[1.1] break-words focus:outline-none"
        >
          Tres libros para {recipientFor(result.profile.relationship)}
        </h1>
        <p className="accent-hand text-lg text-sunlight">elegidos con cariño</p>
      </header>

      <ol className="flex flex-col gap-5 px-5 py-6">
        {result.books.map((book, index) => (
          <li key={`${book.id}-${index}`}>
            <GiftBookCard book={book} />
          </li>
        ))}
      </ol>

      <div className="px-5 pb-10">
        <Button variant="outline" size="lg" className="w-full" onClick={onRestart}>
          Hacer el test para otra persona
        </Button>
      </div>
    </section>
  );
};

export default GiftResult;
