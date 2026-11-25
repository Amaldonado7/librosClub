import type { GiftBook } from '@/lib/gift-contract';
import { wrapLines } from '@/lib/gift-story-layout';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_FILE_NAME = 'librosclub-regalo.png';
export const STORY_SHARE_TEXT = 'Mirá el libro que elegí para regalar. ¿Y vos qué le regalás?';
export const STORY_SHARE_URL = 'https://librosclub.vercel.app/regalo';

export type StoryBook = Pick<GiftBook, 'title' | 'author' | 'coverColor' | 'shareQuote'>;

export interface GiftStoryInput {
  heading: string;
  book: StoryBook;
  cover: Blob | null;
}

export interface GiftStoryDrawInput {
  heading: string;
  book: StoryBook;
  cover: ImageBitmap | null;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

const OLIVE = '#5E5827';
const CREAM = '#F7F0E2';
const YELLOW = '#F2D661';
const TERRACOTTA = '#91551F';
const BROWN = '#492710';

const MONO = '"IBM Plex Mono", monospace';
const SCRIPT = '"Beth Ellen", cursive';
const SERIF = '"Sorts Mill Goudy", Georgia, serif';

const STORY_FONTS = [
  '400 34px "IBM Plex Mono"',
  '600 30px "IBM Plex Mono"',
  '56px "Beth Ellen"',
  '52px "Sorts Mill Goudy"',
  'italic 30px "Sorts Mill Goudy"',
];

const CENTER_X = STORY_WIDTH / 2;
const FLOWER_SIZE = 820;
const FLOWER_TOP = 348;
const FLOWER_SCALE = FLOWER_SIZE / 200;
const FLOWER_CENTER_Y = FLOWER_TOP + FLOWER_SIZE / 2;
const PETALS: Array<[number, number]> = [
  [100, 42], [141, 59], [158, 100], [141, 141], [100, 158], [59, 141], [42, 100], [59, 59],
];

const BOOK_WIDTH = 400;
const BOOK_HEIGHT = 590;
const BOOK_RADII: [number, number, number, number] = [6, 18, 18, 6];
const BOOK_ROTATION = (-4 * Math.PI) / 180;
const SPINE_WIDTH = 22;
const TITLE_PADDING = { top: 56, right: 44, left: 64, bottom: 44 };
const TITLE_WIDTH = BOOK_WIDTH - TITLE_PADDING.left - TITLE_PADDING.right;

const PILL_RIGHT = 1040;
const PILL_TOP = 470;
const PILL_ROTATION = (7 * Math.PI) / 180;

const QUOTE_TOP = FLOWER_TOP + FLOWER_SIZE + 56;
const FOOTER_BOTTOM = 1780;
const LOGO_SIZE = 150;
const LOGO_RADIUS = 96 * 0.75;
const LOGO_TEXT_RADIUS = 54;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string) {
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = value;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  [topLeft, topRight, bottomRight, bottomLeft]: [number, number, number, number],
) {
  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  ctx.lineTo(x + width - topRight, y);
  ctx.arcTo(x + width, y, x + width, y + topRight, topRight);
  ctx.lineTo(x + width, y + height - bottomRight);
  ctx.arcTo(x + width, y + height, x + width - bottomRight, y + height, bottomRight);
  ctx.lineTo(x + bottomLeft, y + height);
  ctx.arcTo(x, y + height, x, y + height - bottomLeft, bottomLeft);
  ctx.lineTo(x, y + topLeft);
  ctx.arcTo(x, y, x + topLeft, y, topLeft);
  ctx.closePath();
}

function pillPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const radius = Math.min(height / 2, width / 2);
  roundedRectPath(ctx, x, y, width, height, [radius, radius, radius, radius]);
}

function drawHeading(ctx: CanvasRenderingContext2D, heading: string) {
  ctx.font = `400 34px ${MONO}`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  setLetterSpacing(ctx, '0.14em');
  const lines = wrapLines(heading, 900, 2, (text) => ctx.measureText(text).width);
  let baseline = 200;
  lines.forEach((line, index) => {
    baseline = 200 + index * 46;
    ctx.fillText(line, CENTER_X, baseline);
  });
  setLetterSpacing(ctx, '0px');
  ctx.font = `56px ${SCRIPT}`;
  ctx.fillStyle = YELLOW;
  ctx.fillText('según LibrosClub', CENTER_X, baseline + 18 + 56);
}

function drawFlower(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(CENTER_X - FLOWER_SIZE / 2, FLOWER_TOP);
  ctx.scale(FLOWER_SCALE, FLOWER_SCALE);
  ctx.fillStyle = YELLOW;
  for (const [x, y] of PETALS) {
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(100, 100, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, cover: ImageBitmap) {
  const scale = Math.max(BOOK_WIDTH / cover.width, BOOK_HEIGHT / cover.height);
  const width = cover.width * scale;
  const height = cover.height * scale;
  ctx.drawImage(cover, -width / 2, -height / 2, width, height);
}

function drawColorBook(ctx: CanvasRenderingContext2D, book: StoryBook) {
  const left = -BOOK_WIDTH / 2;
  const top = -BOOK_HEIGHT / 2;
  ctx.fillStyle = book.coverColor;
  ctx.fillRect(left, top, BOOK_WIDTH, BOOK_HEIGHT);
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `52px ${SERIF}`;
  const titleLines = wrapLines(book.title, TITLE_WIDTH, 5, (text) => ctx.measureText(text).width);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, left + TITLE_PADDING.left, top + TITLE_PADDING.top + index * 57);
  });
  ctx.font = `italic 30px ${SERIF}`;
  const authorLines = wrapLines(book.author, TITLE_WIDTH, 2, (text) => ctx.measureText(text).width);
  const authorBottom = BOOK_HEIGHT / 2 - TITLE_PADDING.bottom;
  authorLines.forEach((line, index) => {
    ctx.fillText(line, left + TITLE_PADDING.left, authorBottom - (authorLines.length - index) * 36);
  });
}

function drawBook(ctx: CanvasRenderingContext2D, book: StoryBook, cover: ImageBitmap | null) {
  const left = -BOOK_WIDTH / 2;
  const top = -BOOK_HEIGHT / 2;
  ctx.save();
  ctx.translate(CENTER_X, FLOWER_CENTER_Y);
  ctx.rotate(BOOK_ROTATION);
  ctx.fillStyle = 'rgba(73,39,16,0.25)';
  roundedRectPath(ctx, left, top + 24, BOOK_WIDTH, BOOK_HEIGHT, BOOK_RADII);
  ctx.fill();
  roundedRectPath(ctx, left, top, BOOK_WIDTH, BOOK_HEIGHT, BOOK_RADII);
  ctx.clip();
  if (cover) drawCoverImage(ctx, cover);
  else drawColorBook(ctx, book);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(left, top, SPINE_WIDTH, BOOK_HEIGHT);
  ctx.restore();
}

function drawStickerPill(ctx: CanvasRenderingContext2D) {
  const label = 'OLOR A LIBRO NUEVO';
  ctx.save();
  ctx.font = `600 26px ${MONO}`;
  setLetterSpacing(ctx, '0.06em');
  const width = ctx.measureText(label).width + 60;
  const height = 26 + 32;
  const x = PILL_RIGHT - width;
  ctx.translate(x + width / 2, PILL_TOP + height / 2);
  ctx.rotate(PILL_ROTATION);
  ctx.fillStyle = TERRACOTTA;
  pillPath(ctx, -width / 2, -height / 2, width, height);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
  setLetterSpacing(ctx, '0px');
  ctx.restore();
}

function drawQuote(ctx: CanvasRenderingContext2D, shareQuote: string) {
  const quote = shareQuote.trim();
  if (quote === '') return;
  ctx.font = `46px ${SERIF}`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const lines = wrapLines(`“${quote}”`, 840, 5, (text) => ctx.measureText(text).width);
  lines.forEach((line, index) => {
    ctx.fillText(line, CENTER_X, QUOTE_TOP + index * 60);
  });
}

function drawArcText(ctx: CanvasRenderingContext2D, text: string, centerX: number, centerY: number, top: boolean) {
  const chars = Array.from(text);
  const step = toRadians(19);
  const start = -((chars.length - 1) * step) / 2;
  chars.forEach((char, index) => {
    const angle = start + index * step;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(top ? angle : -angle);
    ctx.fillText(char, 0, top ? -LOGO_TEXT_RADIUS : LOGO_TEXT_RADIUS);
    ctx.restore();
  });
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const centerX = x + LOGO_SIZE / 2;
  const centerY = y + LOGO_SIZE / 2;
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(centerX, centerY, LOGO_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OLIVE;
  ctx.font = `600 15px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawArcText(ctx, 'LIBROS', centerX, centerY, true);
  drawArcText(ctx, 'CLUB', centerX, centerY, false);
  ctx.strokeStyle = OLIVE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - 14, centerY - 6);
  ctx.lineTo(centerX, centerY + 8);
  ctx.lineTo(centerX + 14, centerY - 6);
  ctx.stroke();
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  const question = '¿Y vos qué le regalás?';
  const site = 'librosclub.vercel.app';
  ctx.font = `38px ${SERIF}`;
  const questionWidth = ctx.measureText(question).width;
  ctx.font = `600 30px ${MONO}`;
  const siteWidth = ctx.measureText(site).width + 52;
  const siteHeight = 30 + 24;
  const columnWidth = Math.max(questionWidth, siteWidth);
  const columnHeight = 38 + 14 + siteHeight;
  const rowWidth = LOGO_SIZE + 28 + columnWidth;
  const rowLeft = CENTER_X - rowWidth / 2;
  const logoTop = FOOTER_BOTTOM - LOGO_SIZE;
  drawLogo(ctx, rowLeft, logoTop);
  const columnLeft = rowLeft + LOGO_SIZE + 28;
  const columnTop = logoTop + (LOGO_SIZE - columnHeight) / 2;
  ctx.font = `38px ${SERIF}`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(question, columnLeft, columnTop);
  const pillTop = columnTop + 38 + 14;
  ctx.fillStyle = YELLOW;
  pillPath(ctx, columnLeft, pillTop, siteWidth, siteHeight);
  ctx.fill();
  ctx.font = `600 30px ${MONO}`;
  ctx.fillStyle = BROWN;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(site, columnLeft + siteWidth / 2, pillTop + siteHeight / 2);
}

export function drawGiftStory(ctx: CanvasRenderingContext2D, { heading, book, cover }: GiftStoryDrawInput): void {
  ctx.fillStyle = OLIVE;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  drawHeading(ctx, heading);
  drawFlower(ctx);
  drawBook(ctx, book, cover);
  drawStickerPill(ctx);
  drawQuote(ctx, book.shareQuote);
  drawFooter(ctx);
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForStoryFonts(timeoutMs = 2000): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts || typeof fonts.load !== 'function') return;
  const loads = Promise.all(STORY_FONTS.map((font) => fonts.load(font))).then(
    () => undefined,
    () => undefined,
  );
  await Promise.race([loads, delay(timeoutMs)]);
}

async function decodeCover(cover: Blob | null): Promise<ImageBitmap | null> {
  if (!cover || typeof createImageBitmap !== 'function') return null;
  try {
    return await createImageBitmap(cover);
  } catch {
    return null;
  }
}

function drawOnNewCanvas(input: GiftStoryDrawInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible.');
  drawGiftStory(ctx, input);
  return canvas;
}

function exportPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(resolve, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

const isSecurityError = (err: unknown) => (err as { name?: unknown } | null)?.name === 'SecurityError';

export async function renderGiftStory({ heading, book, cover }: GiftStoryInput): Promise<Blob> {
  const bitmap = await decodeCover(cover);
  try {
    let blob: Blob | null;
    try {
      blob = await exportPng(drawOnNewCanvas({ heading, book, cover: bitmap }));
    } catch (err) {
      if (!isSecurityError(err)) throw err;
      blob = await exportPng(drawOnNewCanvas({ heading, book, cover: null }));
    }
    if (!blob) throw new Error('No se pudo generar la placa.');
    return blob;
  } finally {
    bitmap?.close();
  }
}

function downloadStory(blob: Blob): ShareOutcome {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = STORY_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return 'downloaded';
}

export async function shareGiftStory(blob: Blob): Promise<ShareOutcome> {
  const file = new File([blob], STORY_FILE_NAME, { type: 'image/png' });
  const canShareFile = typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [file] });
  if (!canShareFile) return downloadStory(blob);
  try {
    await navigator.share({ files: [file], text: STORY_SHARE_TEXT, url: STORY_SHARE_URL });
    return 'shared';
  } catch (err) {
    if ((err as { name?: unknown } | null)?.name === 'AbortError') return 'cancelled';
    throw err;
  }
}
