import React from 'react';
import { motion } from 'framer-motion';

interface GiftLoadingProps {
  recipient: string;
}

const SPINE_COLORS = ['bg-forest', 'bg-terracotta', 'bg-sunlight'];

const GiftLoading: React.FC<GiftLoadingProps> = ({ recipient }) => (
  <section role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
    <div className="flex h-20 items-end gap-2" aria-hidden="true">
      {SPINE_COLORS.map((color, index) => (
        <motion.span
          key={color}
          className={`block h-16 w-5 rounded-btn ${color}`}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
    <h1 className="font-serif text-[32px] font-normal leading-tight break-words">Buscando entre los estantes…</h1>
    <p className="font-serif text-lg leading-relaxed break-words">
      Estamos eligiendo tres libros que tengan la onda de {recipient}.
    </p>
  </section>
);

export default GiftLoading;
