import React, { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GIFT_QUESTIONS, type GiftQuestionData } from '@/lib/gift-test';

interface GiftQuestionProps {
  step: number;
  question: GiftQuestionData;
  value?: string;
  recipient?: string;
  onSelect: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const TOTAL_QUESTIONS = GIFT_QUESTIONS.length;
const FIRST_STEP_WITH_RECIPIENT = 2;

const segmentState = (index: number, step: number) => {
  if (index < step) return 'done';
  if (index === step) return 'current';
  return 'pending';
};

const SEGMENT_CLASSES: Record<string, string> = {
  done: 'bg-forest',
  current: 'bg-terracotta',
  pending: 'bg-line',
};

const GiftQuestion: React.FC<GiftQuestionProps> = ({
  step,
  question,
  value,
  recipient,
  onSelect,
  onNext,
  onBack,
}) => {
  const promptRef = useRef<HTMLHeadingElement>(null);
  const promptId = useId();

  useEffect(() => {
    promptRef.current?.focus();
  }, [step]);

  const showRecipient = step >= FIRST_STEP_WITH_RECIPIENT && Boolean(recipient);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="label-mono">
          PREGUNTA {step + 1} DE {TOTAL_QUESTIONS}
        </p>
        <div className="flex gap-1" aria-hidden="true" data-testid="gift-progress">
          {Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
            const state = segmentState(index, step);
            return (
              <span
                key={index}
                data-state={state}
                className={cn('h-1.5 flex-1 rounded-pill', SEGMENT_CLASSES[state])}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {showRecipient && <p className="accent-hand text-xl text-terracotta">pensá en {recipient}…</p>}
        <h2
          id={promptId}
          ref={promptRef}
          tabIndex={-1}
          className="font-serif text-[28px] font-normal leading-tight break-words focus:outline-none"
        >
          {question.prompt}
        </h2>
      </div>

      <div role="radiogroup" aria-labelledby={promptId} className="flex flex-col gap-2">
        {question.options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(option.value)}
              className={cn(
                'min-h-11 w-full rounded-btn border-[1.5px] px-4 py-3 text-left font-serif text-lg break-words transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'border-forest bg-forest text-warm-cream'
                  : 'border-line bg-surface hover:border-forest',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button variant="accent" onClick={onNext} disabled={value === undefined}>
          Siguiente
        </Button>
      </div>
    </section>
  );
};

export default GiftQuestion;
