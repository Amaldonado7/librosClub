import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GiftQuestion from '../GiftQuestion';
import { GIFT_QUESTIONS } from '@/lib/gift-test';

const noop = () => {};

const renderQuestion = (step: number, props: Partial<React.ComponentProps<typeof GiftQuestion>> = {}) =>
  render(
    <GiftQuestion
      step={step}
      question={GIFT_QUESTIONS[step]}
      onSelect={noop}
      onNext={noop}
      onBack={noop}
      {...props}
    />,
  );

const StatefulQuestion: React.FC<{ step: number }> = ({ step }) => {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <GiftQuestion
      step={step}
      question={GIFT_QUESTIONS[step]}
      value={value}
      onSelect={setValue}
      onNext={noop}
      onBack={noop}
    />
  );
};

describe('GiftQuestion', () => {
  it('pregunta 5 muestra enunciado, 4 opciones y selección única', () => {
    render(<StatefulQuestion step={4} />);
    expect(screen.getByRole('heading', { level: 2, name: '¿Qué le engancha más de una historia?' })).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: '¿Qué le engancha más de una historia?' });
    expect(group).toBeInTheDocument();
    const options = screen.getAllByRole('radio');
    expect(options.map((option) => option.textContent)).toEqual([
      'Que los personajes se enamoren',
      'Descubrir quién fue',
      'Reírse y pasarla bien',
      'Es fan del anime y el manga',
    ]);

    fireEvent.click(screen.getByRole('radio', { name: 'Descubrir quién fue' }));
    expect(screen.getByRole('radio', { name: 'Descubrir quién fue' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);

    fireEvent.click(screen.getByRole('radio', { name: 'Reírse y pasarla bien' }));
    expect(screen.getByRole('radio', { name: 'Descubrir quién fue' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Reírse y pasarla bien' })).toHaveAttribute('aria-checked', 'true');
  });

  it('pregunta 3 tiene exactamente las dos opciones de edad', () => {
    renderQuestion(2);
    expect(screen.getAllByRole('radio').map((option) => option.textContent)).toEqual(['Entre 18 y 30', 'Entre 31 y 60']);
  });

  it('pregunta 5 muestra el indicador y la barra de progreso', () => {
    renderQuestion(4);
    expect(screen.getByText('PREGUNTA 5 DE 8')).toBeInTheDocument();
    const bar = screen.getByTestId('gift-progress');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    const states = Array.from(bar.children).map((segment) => segment.getAttribute('data-state'));
    expect(states.filter((state) => state === 'done')).toHaveLength(4);
    expect(states.filter((state) => state === 'current')).toHaveLength(1);
    expect(states.filter((state) => state === 'pending')).toHaveLength(3);
    expect(states[4]).toBe('current');
  });

  it('muestra "pensá en …" desde la pregunta 3 y no en la 1 ni la 2', () => {
    const { unmount } = renderQuestion(4, { recipient: 'tu mamá' });
    expect(screen.getByText('pensá en tu mamá…')).toBeInTheDocument();
    unmount();

    for (const step of [0, 1]) {
      const view = renderQuestion(step, { recipient: 'tu mamá' });
      expect(screen.queryByText(/pensá en/)).toBeNull();
      view.unmount();
    }
  });

  it('Siguiente está deshabilitado sin respuesta y habilitado con respuesta', () => {
    const { rerender } = renderQuestion(0);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeEnabled();

    rerender(
      <GiftQuestion step={0} question={GIFT_QUESTIONS[0]} value="mama" onSelect={noop} onNext={noop} onBack={noop} />,
    );
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });

  it('dispara onSelect, onNext y onBack', () => {
    const onSelect = vi.fn();
    const onNext = vi.fn();
    const onBack = vi.fn();
    renderQuestion(0, { value: 'papa', onSelect, onNext, onBack });
    fireEvent.click(screen.getByRole('radio', { name: 'Mi pareja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onSelect).toHaveBeenCalledWith('pareja');
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('opciones y botones tienen área táctil de al menos 44 px', () => {
    renderQuestion(0);
    screen.getAllByRole('radio').forEach((option) => expect(option).toHaveClass('min-h-16', 'w-full'));
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveClass('h-14');
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveClass('h-11', 'w-11');
  });

  it('pregunta 5 con una opción elegida sigue el estilo del canvas', () => {
    const elegida = GIFT_QUESTIONS[4].options[1];
    renderQuestion(4, { value: elegida.value });

    screen.getAllByRole('radio').forEach((option) => {
      expect(option).toHaveClass('min-h-16', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2');
      if (option.textContent === elegida.label) {
        expect(option).toHaveClass('bg-forest', 'text-warm-cream');
      } else {
        expect(option).toHaveClass('bg-surface', 'border-line-strong', 'text-wood-dark');
      }
    });

    const segments = Array.from(screen.getByTestId('gift-progress').children);
    expect(segments.filter((segment) => segment.classList.contains('bg-forest'))).toHaveLength(4);
    expect(segments.filter((segment) => segment.classList.contains('bg-sunlight'))).toHaveLength(1);
    expect(segments.filter((segment) => segment.classList.contains('bg-[#E6DCC6]'))).toHaveLength(3);

    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('text-[34px]', 'text-forest');
    expect(screen.getByText('PREGUNTA 5 DE 8')).toHaveClass('label-mono', 'text-forest');

    const volver = screen.getByRole('button', { name: 'Volver' });
    expect(volver).toHaveClass('h-11', 'w-11', 'rounded-pill');
    expect(volver.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveClass('h-14', 'w-full', 'bg-terracotta');
  });
});
