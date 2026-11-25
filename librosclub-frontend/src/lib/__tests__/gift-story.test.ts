import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  STORY_FILE_NAME,
  STORY_HEIGHT,
  STORY_INSTAGRAM_HANDLE,
  STORY_SHARE_TEXT,
  STORY_SHARE_URL,
  STORY_WIDTH,
  drawGiftStory,
  renderGiftStory,
  shareGiftStory,
  waitForStoryFonts,
  type StoryBook,
} from '@/lib/gift-story';
import { storyHeading } from '@/lib/gift-test';

interface Op {
  op: string;
  args: unknown[];
  fillStyle: unknown;
  font: string;
}

interface FakeContext {
  ctx: CanvasRenderingContext2D;
  ops: Op[];
}

const fontSize = (font: string) => Number(/(\d+)px/.exec(font)?.[1] ?? 10);

function fakeContext(): FakeContext {
  const ops: Op[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif', fillStyle: '#000', letterSpacing: '0px' };
  const ctx = new Proxy(state, {
    has: () => true,
    get(target, prop) {
      if (prop === 'measureText') {
        return (text: string) => ({ width: 0.5 * fontSize(String(target.font)) * text.length });
      }
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        ops.push({ op: String(prop), args, fillStyle: target.fillStyle, font: String(target.font) });
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, ops };
}

const BOOK: StoryBook = {
  title: 'La sombra del viento',
  author: 'Carlos Ruiz Zafón',
  coverColor: '#492710',
  shareQuote: 'Un libro para perderse.',
};

const texts = (ops: Op[]) => ops.filter((op) => op.op === 'fillText').map((op) => String(op.args[0]));
const textsWithFont = (ops: Op[], size: number, italic = false) =>
  ops
    .filter((op) => op.op === 'fillText' && fontSize(op.font) === size && op.font.startsWith('italic') === italic)
    .map((op) => String(op.args[0]));
const joinedSingles = (ops: Op[]) => texts(ops).filter((text) => text.length === 1).join('');

function draw(book: StoryBook = BOOK, cover: ImageBitmap | null = null, heading = storyHeading('mama')) {
  const fake = fakeContext();
  drawGiftStory(fake.ctx, { heading, book, cover });
  return fake;
}

const bitmap = () => ({ width: 200, height: 300, close: vi.fn() }) as unknown as ImageBitmap;

describe('drawGiftStory', () => {
  it('empieza pintando el fondo oliva completo', () => {
    const { ops } = draw();
    expect(ops[0]).toMatchObject({ op: 'fillRect', args: [0, 0, 1080, 1920], fillStyle: '#5E5827' });
  });

  it.each([
    ['mama', 'MI REGALO PARA MAMÁ'],
    ['pareja', 'MI REGALO PARA MI PAREJA'],
    ['desconocido', 'MI REGALO PARA ALGUIEN ESPECIAL'],
  ])('dibuja el encabezado para %s', (relationship, expected) => {
    const { ops } = draw(BOOK, null, storyHeading(relationship));
    expect(texts(ops)).toContain(expected);
    expect(texts(ops)).toContain('según LibrosClub');
  });

  it('con portada dibuja el bitmap y no el título ni el autor', () => {
    const cover = bitmap();
    const { ops } = draw(BOOK, cover);
    const images = ops.filter((op) => op.op === 'drawImage');
    expect(images).toHaveLength(1);
    expect(images[0].args[0]).toBe(cover);
    const [, , , width, height] = images[0].args as number[];
    expect(width).toBeGreaterThanOrEqual(400);
    expect(height).toBeGreaterThanOrEqual(590);
    expect(texts(ops)).not.toContain(BOOK.title);
    expect(texts(ops)).not.toContain(BOOK.author);
  });

  it('sin portada pinta el libro de color con título y autor', () => {
    const { ops } = draw();
    expect(ops.some((op) => op.op === 'fillRect' && op.fillStyle === '#492710')).toBe(true);
    expect(ops.filter((op) => op.op === 'drawImage')).toHaveLength(0);
    expect(textsWithFont(ops, 52).join(' ')).toBe(BOOK.title);
    expect(textsWithFont(ops, 30, true).join(' ')).toBe(BOOK.author);
  });

  it('corta un título de 200 caracteres en ≤ 5 líneas que entran en 292 px', () => {
    const title = Array.from({ length: 40 }, () => 'libro').join(' ').slice(0, 200);
    const { ops } = draw({ ...BOOK, title });
    const lines = textsWithFont(ops, 52);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(lines[lines.length - 1].endsWith('…')).toBe(true);
    lines.forEach((line) => expect(0.5 * 52 * line.length).toBeLessThanOrEqual(292));
  });

  it('dibuja la cita completa entre comillas sin … con 120 caracteres', () => {
    const shareQuote = 'Una historia que te acompaña mucho después de cerrar el libro y que vas a querer contarle a todos tus amigos hoy mismo!!';
    expect(shareQuote).toHaveLength(120);
    const { ops } = draw({ ...BOOK, shareQuote: `  ${shareQuote}  ` });
    const lines = textsWithFont(ops, 46);
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(lines.join(' ')).toBe(`“${shareQuote}”`);
    expect(lines.some((line) => line.includes('…'))).toBe(false);
    lines.forEach((line) => expect(0.5 * 46 * line.length).toBeLessThanOrEqual(840));
  });

  it('nunca dibuja la dedicatoria', () => {
    const book = { ...BOOK, dedication: 'Para vos, con cariño' } as StoryBook;
    const { ops } = draw(book);
    expect(texts(ops).join(' ')).not.toContain('Para vos');
  });

  it.each(['', '   '])('sin cita (%j) no dibuja comillas pero sí el resto', (shareQuote) => {
    const { ops } = draw({ ...BOOK, shareQuote });
    const all = texts(ops);
    expect(all.some((text) => text.includes('“') || text.includes('”'))).toBe(false);
    expect(all).toContain('¿Y vos qué le regalás?');
    expect(all).toContain('@librosclub');
    expect(joinedSingles(ops)).toContain('LIBROS');
    expect(joinedSingles(ops)).toContain('CLUB');
    expect(textsWithFont(ops, 52).join(' ')).toBe(BOOK.title);
  });

  it.each([null, bitmap()])('siempre dibuja la marca y la pastilla (portada %s)', (cover) => {
    const { ops } = draw(BOOK, cover);
    const all = texts(ops);
    expect(all).toContain('OLOR A LIBRO NUEVO');
    expect(all).toContain('¿Y vos qué le regalás?');
    expect(all).toContain('@librosclub');
    expect(all.some((text) => text.includes('librosclub.vercel.app'))).toBe(false);
    expect(joinedSingles(ops)).toBe('LIBROSCLUB');
  });

  it('dibuja el ícono de Instagram en la pastilla, antes del usuario', () => {
    const { ops } = draw();
    const question = ops.findIndex((op) => op.op === 'fillText' && op.args[0] === '¿Y vos qué le regalás?');
    const pillFill = ops.findIndex((op, index) => index > question && op.op === 'fill' && op.fillStyle === '#F2D661');
    const handle = ops.findIndex((op) => op.op === 'fillText' && op.args[0] === STORY_INSTAGRAM_HANDLE);
    expect(STORY_INSTAGRAM_HANDLE).toBe('@librosclub');
    expect(pillFill).toBeGreaterThan(-1);
    expect(handle).toBeGreaterThan(pillFill);
    const icon = ops.slice(pillFill + 1, handle);
    expect(icon.filter((op) => op.op === 'stroke')).toHaveLength(2);
    expect(icon.filter((op) => op.op === 'arc')).toHaveLength(2);
    expect(icon.filter((op) => op.op === 'fill')).toHaveLength(1);
    expect(icon.find((op) => op.op === 'fill')?.fillStyle).toBe('#492710');
    expect(ops[handle].fillStyle).toBe('#492710');
  });

  it('dibuja un título con HTML como texto literal sin crear imágenes', () => {
    const before = document.querySelectorAll('img').length;
    const title = '<img src=x onerror=alert(1)>';
    const { ops } = draw({ ...BOOK, title });
    const lines = textsWithFont(ops, 52);
    expect(lines.join('').replace(/ /g, '')).toBe(title.replace(/ /g, ''));
    lines.forEach((line) => expect(title).toContain(line));
    expect(document.querySelectorAll('img').length).toBe(before);
  });

  it('funciona sin letterSpacing en el contexto', () => {
    const fake = fakeContext();
    const ctx = new Proxy(fake.ctx as unknown as object, {
      has: (target, prop) => prop !== 'letterSpacing' && Reflect.has(target, prop),
    }) as CanvasRenderingContext2D;
    drawGiftStory(ctx, { heading: storyHeading('mama'), book: BOOK, cover: null });
    expect(texts(fake.ops)).toContain('OLOR A LIBRO NUEVO');
  });
});

describe('waitForStoryFonts', () => {
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

  const setFonts = (value: unknown) => {
    Object.defineProperty(document, 'fonts', { configurable: true, value });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
    else delete (document as unknown as Record<string, unknown>).fonts;
  });

  it('resuelve a los 2000 ms si las fuentes no cargan, no antes', async () => {
    const load = vi.fn((_font: string) => new Promise(() => {}));
    setFonts({ load });
    let done = false;
    const pending = waitForStoryFonts().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
    expect(load.mock.calls.map((call) => call[0])).toEqual([
      '400 34px "IBM Plex Mono"',
      '600 30px "IBM Plex Mono"',
      '56px "Beth Ellen"',
      '52px "Sorts Mill Goudy"',
      'italic 30px "Sorts Mill Goudy"',
    ]);
  });

  it('resuelve sin error si load rechaza', async () => {
    setFonts({ load: vi.fn().mockRejectedValue(new Error('sin red')) });
    await expect(waitForStoryFonts()).resolves.toBeUndefined();
  });

  it('resuelve enseguida cuando las fuentes cargan', async () => {
    setFonts({ load: vi.fn().mockResolvedValue([]) });
    await expect(waitForStoryFonts()).resolves.toBeUndefined();
  });

  it('resuelve sin document.fonts', async () => {
    setFonts(undefined);
    await expect(waitForStoryFonts()).resolves.toBeUndefined();
  });
});

describe('renderGiftStory', () => {
  let contexts: FakeContext[];
  let toBlobTypes: unknown[];
  let canvasSizes: Array<[number, number]>;
  let toBlobBehavior: (callback: BlobCallback) => void;

  beforeEach(() => {
    contexts = [];
    toBlobTypes = [];
    canvasSizes = [];
    toBlobBehavior = (callback) => callback(new Blob(['png'], { type: 'image/png' }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext() {
      const fake = fakeContext();
      contexts.push(fake);
      return fake.ctx as unknown as RenderingContext;
    } as unknown as HTMLCanvasElement['getContext']);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
    ) {
      toBlobTypes.push(type);
      canvasSizes.push([this.width, this.height]);
      toBlobBehavior(callback);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exporta un PNG de 1080 × 1920 empezando por el fondo', async () => {
    const blob = await renderGiftStory({ heading: storyHeading('mama'), book: BOOK, cover: null });
    expect(blob.type).toBe('image/png');
    expect(toBlobTypes).toEqual(['image/png']);
    expect(canvasSizes).toEqual([[STORY_WIDTH, STORY_HEIGHT]]);
    expect(STORY_WIDTH).toBe(1080);
    expect(STORY_HEIGHT).toBe(1920);
    expect(contexts[0].ops[0]).toMatchObject({ op: 'fillRect', args: [0, 0, 1080, 1920], fillStyle: '#5E5827' });
  });

  it('decodifica la portada, la dibuja y cierra el bitmap', async () => {
    const cover = bitmap();
    const decode = vi.fn().mockResolvedValue(cover);
    vi.stubGlobal('createImageBitmap', decode);
    const blobIn = new Blob(['jpg'], { type: 'image/jpeg' });
    await renderGiftStory({ heading: storyHeading('mama'), book: BOOK, cover: blobIn });
    expect(decode).toHaveBeenCalledWith(blobIn);
    expect(contexts[0].ops.filter((op) => op.op === 'drawImage')).toHaveLength(1);
    expect(cover.close).toHaveBeenCalledTimes(1);
  });

  it('si createImageBitmap rechaza dibuja el libro de color', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('formato')));
    await renderGiftStory({ heading: storyHeading('mama'), book: BOOK, cover: new Blob(['x']) });
    expect(contexts[0].ops.filter((op) => op.op === 'drawImage')).toHaveLength(0);
    expect(textsWithFont(contexts[0].ops, 52).join(' ')).toBe(BOOK.title);
  });

  it('sin createImageBitmap dibuja el libro de color', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    await renderGiftStory({ heading: storyHeading('mama'), book: BOOK, cover: new Blob(['x']) });
    expect(contexts[0].ops.filter((op) => op.op === 'drawImage')).toHaveLength(0);
  });

  it('si toBlob lanza SecurityError redibuja sin portada y exporta igual', async () => {
    const cover = bitmap();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(cover));
    let calls = 0;
    toBlobBehavior = (callback) => {
      calls += 1;
      if (calls === 1) throw new DOMException('tainted', 'SecurityError');
      callback(new Blob(['png'], { type: 'image/png' }));
    };
    const blob = await renderGiftStory({ heading: storyHeading('mama'), book: BOOK, cover: new Blob(['x']) });
    expect(blob.type).toBe('image/png');
    expect(contexts).toHaveLength(2);
    expect(contexts[1].ops.filter((op) => op.op === 'drawImage')).toHaveLength(0);
    expect(textsWithFont(contexts[1].ops, 52).join(' ')).toBe(BOOK.title);
    expect(textsWithFont(contexts[1].ops, 30, true).join(' ')).toBe(BOOK.author);
    expect(cover.close).toHaveBeenCalledTimes(1);
  });

  it('rechaza si el segundo intento también falla', async () => {
    toBlobBehavior = () => {
      throw new DOMException('tainted', 'SecurityError');
    };
    await expect(renderGiftStory({ heading: 'x', book: BOOK, cover: null })).rejects.toThrow();
  });

  it('rechaza ante otro error de toBlob sin reintentar', async () => {
    toBlobBehavior = () => {
      throw new Error('memoria');
    };
    await expect(renderGiftStory({ heading: 'x', book: BOOK, cover: null })).rejects.toThrow('memoria');
    expect(contexts).toHaveLength(1);
  });

  it('rechaza si toBlob entrega null', async () => {
    toBlobBehavior = (callback) => callback(null);
    await expect(renderGiftStory({ heading: 'x', book: BOOK, cover: null })).rejects.toThrow();
  });

  it('rechaza si no hay contexto 2D', async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    await expect(renderGiftStory({ heading: 'x', book: BOOK, cover: null })).rejects.toThrow();
  });
});

describe('shareGiftStory', () => {
  const png = () => new Blob(['png'], { type: 'image/png' });
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clicked: HTMLAnchorElement[];

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:placa');
    revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
      clicked.push(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });

  it('comparte el archivo con texto y URL cuando se puede', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn(() => true);
    Object.assign(navigator, { share, canShare });
    expect(await shareGiftStory(png())).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    const data = share.mock.calls[0][0] as ShareData;
    expect(data.files).toHaveLength(1);
    expect(data.files?.[0].name).toBe(STORY_FILE_NAME);
    expect(data.files?.[0].name).toBe('librosclub-regalo.png');
    expect(data.files?.[0].type).toBe('image/png');
    expect(data.text).toBe(STORY_SHARE_TEXT);
    expect(data.text).toBe('Mirá el libro que elegí para regalar. ¿Y vos qué le regalás?');
    expect(data.url).toBe(STORY_SHARE_URL);
    expect(data.url).toBe('https://librosclub.vercel.app/regalo');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it.each([
    ['sin canShare', {}],
    ['canShare false', { canShare: () => false, share: vi.fn() }],
  ])('descarga el PNG %s', async (_name, nav) => {
    vi.useFakeTimers();
    Object.assign(navigator, nav);
    const blob = png();
    expect(await shareGiftStory(blob)).toBe('downloaded');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('librosclub-regalo.png');
    expect(clicked[0].href).toBe('blob:placa');
    expect(clicked[0].isConnected).toBe(false);
    const share = (nav as { share?: ReturnType<typeof vi.fn> }).share;
    if (share) expect(share).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:placa');
  });

  it('devuelve cancelled si el usuario cierra el menú', async () => {
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError')),
    });
    expect(await shareGiftStory(png())).toBe('cancelled');
  });

  it('relanza NotAllowedError', async () => {
    Object.assign(navigator, {
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new DOMException('sin activación', 'NotAllowedError')),
    });
    await expect(shareGiftStory(png())).rejects.toMatchObject({ name: 'NotAllowedError' });
  });
});

describe('pedidos de red del módulo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });

  it('no hace ningún fetch en fuentes, render ni share', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: vi.fn().mockResolvedValue([]) } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => fakeContext().ctx) as unknown as HTMLCanvasElement['getContext'],
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) =>
      callback(new Blob(['png'], { type: 'image/png' })),
    );
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap()));
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await waitForStoryFonts();
    const blob = await renderGiftStory({ heading: storyHeading('mama'), book: BOOK, cover: new Blob(['x']) });
    Object.assign(navigator, { canShare: () => true, share: vi.fn().mockResolvedValue(undefined) });
    await shareGiftStory(blob);
    Object.assign(navigator, { canShare: undefined, share: undefined });
    await shareGiftStory(blob);
    expect(fetchSpy).not.toHaveBeenCalled();
    delete (document as unknown as Record<string, unknown>).fonts;
  });
});
