import React from 'react';
import { Button } from '@/components/ui/button';
import FloralSeal from '@/components/brand/FloralSeal';
import Sticker from '@/components/brand/Sticker';

interface GiftIntroProps {
  onStart: () => void;
}

const GiftIntro: React.FC<GiftIntroProps> = ({ onStart }) => (
  <section className="relative flex flex-1 flex-col items-center overflow-hidden px-7 pt-14 pb-10 text-center">
    <div className="flex items-center gap-2.5">
      <p className="label-mono text-warm-cream">Regalá un libro</p>
      <FloralSeal variant="mark" size={28} />
    </div>
    <FloralSeal variant="emblem" size={250} label="LibrosClub" className="mt-6" />
    <h1 className="mt-6 max-w-[300px] font-serif text-[40px] font-normal leading-[1.05] break-words">
      El libro justo para cada persona
    </h1>
    <p className="mt-4 max-w-[300px] font-serif text-lg leading-relaxed break-words">
      Contanos cómo es quien recibe el regalo y te elegimos tres libros que se consiguen en Argentina.
    </p>
    <p className="accent-hand mt-4 text-xl text-sunlight">hola libro nuevo</p>
    <div className="flex-1" />
    <div className="mt-8 flex w-full flex-col items-center gap-3">
      <Button
        variant="accent"
        size="lg"
        className="w-full focus-visible:ring-sunlight ring-offset-forest"
        onClick={onStart}
      >
        Empezar el test
      </Button>
      <p className="font-mono text-xs text-warm-cream">8 preguntas · menos de 2 minutos</p>
    </div>
    <Sticker tone="sun" rotate={-8} className="absolute left-2.5 top-[340px]">
      Olor a libro nuevo
    </Sticker>
  </section>
);

export default GiftIntro;
