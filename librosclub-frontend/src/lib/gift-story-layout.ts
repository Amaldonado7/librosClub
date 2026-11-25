export type Measure = (text: string) => number;

const ELLIPSIS = '…';

function splitByCharacters(word: string, maxWidth: number, measure: Measure): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const char of Array.from(word)) {
    if (current !== '' && measure(current + char) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current !== '') pieces.push(current);
  return pieces;
}

function greedyLines(words: string[], maxWidth: number, measure: Measure): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (measure(word) > maxWidth) {
      if (current !== '') lines.push(current);
      const pieces = splitByCharacters(word, maxWidth, measure);
      lines.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1];
      continue;
    }
    const candidate = current === '' ? word : `${current} ${word}`;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

function withEllipsis(line: string, maxWidth: number, measure: Measure): string {
  let kept = Array.from(line);
  while (kept.length > 0 && measure(kept.join('').trimEnd() + ELLIPSIS) > maxWidth) {
    kept = kept.slice(0, -1);
  }
  return kept.join('').trimEnd() + ELLIPSIS;
}

export function wrapLines(text: string, maxWidth: number, maxLines: number, measure: Measure): string[] {
  const words = text.trim().split(/\s+/).filter((word) => word !== '');
  if (words.length === 0 || maxLines < 1) return [];
  const lines = greedyLines(words, maxWidth, measure);
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = withEllipsis(visible[maxLines - 1], maxWidth, measure);
  return visible;
}
