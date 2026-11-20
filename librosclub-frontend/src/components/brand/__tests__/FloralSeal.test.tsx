import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FloralSeal from '../FloralSeal';

describe('FloralSeal', () => {
  it('sin label es decorativo', () => {
    const { container } = render(<FloralSeal />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('con label expone role img y aria-label', () => {
    const { container } = render(<FloralSeal variant="emblem" label="LibrosClub" />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'LibrosClub');
  });

  it('dos emblemas no repiten ids de path', () => {
    const { container } = render(
      <>
        <FloralSeal variant="emblem" />
        <FloralSeal variant="emblem" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('path')).map((path) => path.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).not.toContain(':'));
  });
});
