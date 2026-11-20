import React from 'react';
import { cn } from '@/lib/utils';

export type StickerTone = 'sun' | 'terracotta';

export interface StickerProps {
  children: React.ReactNode;
  tone?: StickerTone;
  rotate?: number;
  decorative?: boolean;
  className?: string;
}

const MAX_ROTATION = 8;

const TONE_CLASSES: Record<StickerTone, string> = {
  sun: 'pill-sun',
  terracotta: 'pill-terracotta',
};

const clampRotation = (deg: number) => Math.min(MAX_ROTATION, Math.max(-MAX_ROTATION, deg));

const Sticker: React.FC<StickerProps> = ({
  children,
  tone = 'sun',
  rotate = -6,
  decorative = true,
  className,
}) => (
  <span
    aria-hidden={decorative ? true : undefined}
    className={cn(
      'pill gap-1.5 font-mono uppercase text-[13px] px-[18px] py-[9px] tracking-[0.06em]',
      TONE_CLASSES[tone],
      className,
    )}
    style={{ transform: `rotate(${clampRotation(rotate)}deg)` }}
  >
    {children}
  </span>
);

export default Sticker;
