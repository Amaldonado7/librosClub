import React from 'react';
import Sticker from '@/components/brand/Sticker';

interface GiftLoadingProps {
  recipient: string;
}

const FLOWER_PETALS: ReadonlyArray<[number, number]> = [
  [100, 38],
  [144, 56],
  [162, 100],
  [144, 144],
  [100, 162],
  [56, 144],
  [38, 100],
  [56, 56],
];

const GiftLoading: React.FC<GiftLoadingProps> = ({ recipient }) => (
  <section
    role="status"
    aria-live="polite"
    className="relative flex flex-1 flex-col items-center justify-center gap-9 overflow-hidden px-7 py-12 text-center"
  >
    <div className="relative h-[150px] w-[150px]" aria-hidden="true">
      <svg
        data-testid="gift-loading-flower"
        width="150"
        height="150"
        viewBox="0 0 200 200"
        focusable="false"
        className="absolute inset-0 motion-safe:[animation:spin_6s_linear_infinite]"
      >
        <circle cx="100" cy="100" r="46" fill="#F2D661" />
        {FLOWER_PETALS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="28" fill="#F2D661" />
        ))}
      </svg>
      <svg width="150" height="150" viewBox="0 0 200 200" focusable="false" className="absolute inset-0">
        <rect x="62" y="122" width="76" height="18" rx="3" className="fill-terracotta" />
        <rect x="70" y="104" width="62" height="18" rx="3" className="fill-forest" />
        <rect x="66" y="86" width="68" height="18" rx="3" className="fill-warm-cream" />
        <rect x="74" y="98" width="52" height="2" className="fill-wood-dark" />
      </svg>
    </div>
    <h1 className="max-w-[240px] font-mono text-xl font-medium uppercase tracking-[0.06em] break-words">
      Buscando entre los estantes…
    </h1>
    <p className="max-w-[280px] font-serif text-lg leading-relaxed break-words">
      Estamos eligiendo tres libros que tengan la onda de {recipient}.
    </p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Sticker tone="terracotta" rotate={-3}>
        Compro, apilo, algún día leo
      </Sticker>
      <Sticker tone="sun" rotate={2}>
        No lo compré, me adoptó
      </Sticker>
    </div>
  </section>
);

export default GiftLoading;
