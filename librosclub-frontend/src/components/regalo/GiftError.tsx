import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { GiftErrorKind } from '@/lib/gift-contract';

interface GiftErrorProps {
  kind: GiftErrorKind;
  onRetry: () => void;
  onRestart: () => void;
}

const ERROR_MESSAGES: Record<GiftErrorKind, string> = {
  invalid: 'Algo salió mal con tus respuestas.',
  rate_limited: 'Hiciste muchos tests seguidos. Probá de nuevo en unos minutos.',
  unavailable: 'Ahora no tenemos libros para recomendar. Probá más tarde.',
  network: 'No pudimos buscar libros ahora. Revisá tu conexión y probá de nuevo.',
};

const GiftError: React.FC<GiftErrorProps> = ({ kind, onRetry, onRestart }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="flex flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div role="alert">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-serif text-[28px] font-normal leading-tight text-forest break-words focus:outline-none"
        >
          {ERROR_MESSAGES[kind]}
        </h1>
      </div>
      <div>
        {kind === 'invalid' ? (
          <Button variant="accent" size="lg" onClick={onRestart}>
            Empezar de nuevo
          </Button>
        ) : (
          <Button variant="accent" size="lg" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    </section>
  );
};

export default GiftError;
