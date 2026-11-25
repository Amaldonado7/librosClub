import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GiftLoading from '../GiftLoading';

const ANIMATION_TOKEN = /animate-|animation/;

const classesOf = (element: Element) => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

describe('GiftLoading', () => {
  it('muestra el título, el destinatario y las pastillas del canvas', () => {
    render(<GiftLoading recipient="tu mamá" />);
    const title = screen.getByRole('heading', { level: 1, name: 'Buscando entre los estantes…' });
    expect(title).toHaveClass('font-mono', 'uppercase');
    expect(screen.getByText('Estamos eligiendo tres libros que tengan la onda de tu mamá.')).toBeInTheDocument();
    expect(screen.getByText('Compro, apilo, algún día leo')).toHaveClass('pill-terracotta');
    expect(screen.getByText('No lo compré, me adoptó')).toHaveClass('pill-sun');
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveClass('overflow-hidden');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('solo la flor gira, a 6 s lineal e infinito, y únicamente con motion-safe', () => {
    const { container } = render(<GiftLoading recipient="tu mamá" />);
    const flower = screen.getByTestId('gift-loading-flower');
    expect(flower.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(flower.querySelectorAll('circle')).toHaveLength(9);
    expect(flower.querySelector('text')).toBeNull();

    const flowerClasses = classesOf(flower);
    expect(flowerClasses).toContain('motion-safe:[animation:spin_6s_linear_infinite]');
    flowerClasses
      .filter((name) => !name.startsWith('motion-safe:'))
      .forEach((name) => expect(name).not.toMatch(ANIMATION_TOKEN));

    const others = Array.from(container.querySelectorAll('*')).filter((element) => element !== flower);
    others.forEach((element) => {
      classesOf(element).forEach((name) => expect(name).not.toMatch(ANIMATION_TOKEN));
    });
    expect(container.querySelectorAll('svg text, svg [href], svg use')).toHaveLength(0);
  });
});
