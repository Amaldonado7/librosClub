import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');
const REGALO_DIR = join(SRC, 'components', 'regalo');

const indexCss = readFileSync(join(SRC, 'index.css'), 'utf8');

type Rgb = [number, number, number];

const tokenHsl = (name: string): [number, number, number] => {
  const match = indexCss.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%;`));
  if (!match) throw new Error(`token --${name} no encontrado`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const hslToRgb = ([h, s, l]: [number, number, number]): Rgb => {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [channel(0), channel(8), channel(4)].map((value) => Math.round(value * 255)) as Rgb;
};

const hexToRgb = (hex: string): Rgb =>
  [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;

const tokenRgb = (name: string) => hslToRgb(tokenHsl(name));

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: Rgb, b: Rgb) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const CANVAS_TOKENS: ReadonlyArray<[string, string]> = [
  ['forest', '#5E5827'],
  ['warm-cream', '#F7F0E2'],
  ['sunlight', '#F2D661'],
  ['terracotta', '#91551F'],
  ['wood-dark', '#492710'],
  ['surface', '#FFFBF2'],
  ['line', '#E2D6BA'],
  ['line-strong', '#CFC3A6'],
];

const TEXT_PAIRS: ReadonlyArray<[string, string]> = [
  ['warm-cream', 'forest'],
  ['warm-cream', 'wood-dark'],
  ['warm-cream', 'terracotta'],
  ['sunlight', 'forest'],
  ['wood-dark', 'sunlight'],
  ['wood-dark', 'warm-cream'],
  ['wood-dark', 'surface'],
  ['forest', 'warm-cream'],
  ['forest', 'surface'],
  ['terracotta', 'warm-cream'],
  ['terracotta', 'surface'],
];

const FIXED_WIDTH = /(?<![\w-])(?:min-)?w-\[(\d+)px\]/g;
const MAX_CONTENT_WIDTH = 264;

const regaloSources = () =>
  readdirSync(REGALO_DIR)
    .filter((entry) => /\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry))
    .map((entry) => ({ entry, source: readFileSync(join(REGALO_DIR, entry), 'utf8') }));

const fixedWidths = (source: string) => [...source.matchAll(FIXED_WIDTH)].map((match) => Number(match[1]));

describe('estilo del canvas de /regalo', () => {
  it.each(CANVAS_TOKENS)('el token --%s coincide con %s a ±3 por canal', (name, hex) => {
    const actual = tokenRgb(name);
    const expected = hexToRgb(hex);
    actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThanOrEqual(3));
  });

  it.each(TEXT_PAIRS)('el texto %s sobre %s tiene contraste de al menos 4,5:1', (text, background) => {
    expect(contrast(tokenRgb(text), tokenRgb(background))).toBeGreaterThanOrEqual(4.5);
  });

  it('el patrón de anchos fijos captura w-[N] y min-w-[N] y no max-w-[N]', () => {
    expect(fixedWidths('w-[300px]')).toEqual([300]);
    expect(fixedWidths('min-w-[300px]')).toEqual([300]);
    expect(fixedWidths('max-w-[480px]')).toEqual([]);
    expect(fixedWidths('"mx-auto max-w-[300px] h-[26px] w-[26px]"')).toEqual([26]);
  });

  it('ningún ancho fijo de /regalo supera el ancho útil a 320 px', () => {
    const sources = regaloSources();
    expect(sources.length).toBeGreaterThan(0);
    const offenders = sources.flatMap(({ entry, source }) =>
      fixedWidths(source)
        .filter((width) => width > MAX_CONTENT_WIDTH)
        .map((width) => `${entry}: w-[${width}px]`),
    );
    expect(offenders).toEqual([]);
  });

  it.each(['GiftIntro.tsx', 'GiftLoading.tsx'])('%s recorta lo que sobresale con overflow-hidden', (entry) => {
    const source = readFileSync(join(REGALO_DIR, entry), 'utf8');
    expect(source).toMatch(/<section[\s\S]*?className="[^"]*\boverflow-hidden\b[^"]*"/);
  });
});
