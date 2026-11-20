export interface CoverColors {
  bg: string;
  fg: string;
}

export const COVER_PALETTE: readonly CoverColors[] = [
  { bg: '#5E5827', fg: '#F7F0E2' },
  { bg: '#91551F', fg: '#F7F0E2' },
  { bg: '#492710', fg: '#F7F0E2' },
  { bg: '#E6DCC6', fg: '#492710' },
  { bg: '#3F3B1A', fg: '#F2D661' },
];

export function coverPaletteFor(seed: string): CoverColors {
  let sum = 0;
  for (let i = 0; i < (seed ?? '').length; i += 1) {
    sum += seed.charCodeAt(i);
  }
  return COVER_PALETTE[sum % COVER_PALETTE.length];
}
