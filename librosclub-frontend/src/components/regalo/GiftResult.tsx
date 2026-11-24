import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { GiftResponse } from '@/lib/gift-contract';
import { recipientFor, resultHeading } from '@/lib/gift-test';
import GiftBookCard from './GiftBookCard';

interface GiftResultProps {
  result: GiftResponse;
  onRestart: () => void;
}

const GiftResult: React.FC<GiftResultProps> = ({ result, onRestart }) => {
  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="label-mono break-words">{resultHeading(result.profile)}</p>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-serif text-[36px] font-normal leading-[1.05] break-words focus:outline-none"
        >
          Tres libros para {recipientFor(result.profile.relationship)}
        </h1>
        <p className="accent-hand text-xl text-terracotta">elegidos con cariño</p>
      </header>

      <ol className="flex flex-col gap-6">
        {result.books.map((book, index) => (
          <li key={`${book.id}-${index}`}>
            <GiftBookCard book={book} />
          </li>
        ))}
      </ol>

      <Button variant="outline" size="lg" onClick={onRestart}>
        Hacer el test para otra persona
      </Button>

      {isAuthenticated ? (
        <Link to="/app" className={cn(buttonVariants({ variant: 'default' }), 'min-h-11 self-start')}>
          Ir a LibrosClub
        </Link>
      ) : (
        <aside className="card-surface flex flex-col items-start gap-3 p-5">
          <h2 className="font-serif text-2xl font-normal">Sumate a LibrosClub</h2>
          <p className="font-serif leading-relaxed break-words">
            Intercambiá libros, unite a clubes de lectura y encontrá tu próxima historia.
          </p>
          <Button variant="accent" onClick={() => setAuthOpen(true)}>
            Registrarme
          </Button>
        </aside>
      )}

      <AuthModal open={authOpen} defaultMode="register" onClose={() => setAuthOpen(false)} />
    </section>
  );
};

export default GiftResult;
