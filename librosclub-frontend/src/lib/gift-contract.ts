import { safeExternalUrl } from '@/lib/safe-url';
import { coverPaletteFor } from '@/lib/cover-palette';

export const ANSWER_VALUES = {
  relationship: ['mama', 'papa', 'pareja', 'amigo', 'hermano', 'hijo', 'otro'],
  occasion: ['cumpleanos', 'navidad', 'dia_madre_padre', 'aniversario', 'porque_si'],
  age: ['joven', 'adulto'],
  readingLevel: ['casi_nunca', 'vacaciones', 'mensual', 'devora'],
  hook: ['amor', 'misterio', 'humor', 'anime_manga'],
  kind: ['novela', 'historia_real', 'aprender', 'poesia'],
  length: ['corto', 'mediano', 'indistinto'],
  tone: ['liviano', 'emotivo', 'intenso'],
} as const;

export type GiftField = keyof typeof ANSWER_VALUES;

export type GiftAnswers = { [F in GiftField]: (typeof ANSWER_VALUES)[F][number] };

export type GiftErrorKind = 'invalid' | 'rate_limited' | 'unavailable' | 'network';

export interface GiftProfile {
  relationship: string;
  occasion: string;
}

export interface GiftBook {
  id: number;
  title: string;
  author: string;
  genreLabel: string;
  coverUrl: string | null;
  coverColor: string;
  why: string;
  dedication: string;
  shareQuote: string;
  buyUrl: string | null;
}

export interface GiftResponse {
  profile: GiftProfile;
  books: GiftBook[];
}

const COVER_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const REQUIRED_BOOK_STRINGS = ['title', 'author', 'genreLabel', 'why', 'dedication', 'coverColor', 'buyUrl'] as const;
const RESULT_SIZE = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidBook = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  REQUIRED_BOOK_STRINGS.every((key) => typeof value[key] === 'string') &&
  (value.coverUrl === null || typeof value.coverUrl === 'string');

const toGiftBook = (raw: Record<string, unknown>): GiftBook => {
  const title = raw.title as string;
  const coverColor = raw.coverColor as string;
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    title,
    author: raw.author as string,
    genreLabel: raw.genreLabel as string,
    coverUrl: safeExternalUrl(raw.coverUrl as string | null),
    coverColor: COVER_COLOR_PATTERN.test(coverColor) ? coverColor : coverPaletteFor(title).bg,
    why: raw.why as string,
    dedication: raw.dedication as string,
    shareQuote: typeof raw.shareQuote === 'string' ? raw.shareQuote : '',
    buyUrl: safeExternalUrl(raw.buyUrl as string),
  };
};

export function parseGiftResponse(json: unknown): GiftResponse | null {
  if (!isRecord(json)) return null;
  const { profile, books } = json;
  if (!isRecord(profile) || typeof profile.relationship !== 'string' || typeof profile.occasion !== 'string') {
    return null;
  }
  if (!Array.isArray(books) || books.length < RESULT_SIZE) return null;
  const selected = books.slice(0, RESULT_SIZE);
  if (!selected.every(isValidBook)) return null;
  return {
    profile: { relationship: profile.relationship, occasion: profile.occasion },
    books: selected.map(toGiftBook),
  };
}
