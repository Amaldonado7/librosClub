import React from 'react';
import { Button } from '@/components/ui/button';

interface GiftIntroProps {
  onStart: () => void;
}

const GiftIntro: React.FC<GiftIntroProps> = ({ onStart }) => (
  <section className="flex flex-1 flex-col justify-center gap-6">
    <h1 className="font-serif text-[40px] font-normal leading-[1.05] break-words">El libro justo para cada persona</h1>
    <p className="font-serif text-lg leading-relaxed break-words">
      Contanos cómo es quien recibe el regalo y te elegimos tres libros que se consiguen en Argentina.
    </p>
    <div className="flex flex-col items-start gap-3">
      <Button variant="accent" size="lg" onClick={onStart}>
        Empezar el test
      </Button>
      <p className="label-mono text-muted-foreground">8 preguntas · menos de 2 minutos</p>
    </div>
  </section>
);

export default GiftIntro;
