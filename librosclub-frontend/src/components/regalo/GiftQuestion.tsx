import React, { useEffect, useId, useRef } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
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
  current: 'bg-sunlight',
  pending: 'bg-[#E6DCC6]',
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
    <section className="flex flex-1 flex-col gap-6 px-6 pt-12 pb-9">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-pill" aria-label="Volver" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p className="label-mono text-center text-[13px] text-forest">
            PREGUNTA {step + 1} DE {TOTAL_QUESTIONS}
          </p>
          <span className="w-11" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-8 gap-1.5" aria-hidden="true" data-testid="gift-progress">
          {Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
            const state = segmentState(index, step);
            return (
              <span
                key={index}
                data-state={state}
                className={cn('h-1.5 rounded-pill', SEGMENT_CLASSES[state])}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {showRecipient && <p className="accent-hand text-lg text-terracotta">pensá en {recipient}…</p>}
        <h2
          id={promptId}
          ref={promptRef}
          tabIndex={-1}
          className="font-serif text-[34px] font-normal leading-[1.1] text-forest break-words focus:outline-none"
        >
          {question.prompt}
        </h2>
      </div>

      <div role="radiogroup" aria-labelledby={promptId} className="flex flex-col gap-2.5">
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
                'flex min-h-16 w-full items-center gap-3.5 rounded-md border-[1.5px] px-4 py-3 text-left font-serif text-[19px] break-words transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'border-forest bg-forest text-warm-cream'
                  : 'border-line-strong bg-surface text-wood-dark hover:border-forest',
              )}
            >
              <span
                className={cn(
                  'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-pill',
                  selected ? 'bg-sunlight' : 'border-[1.5px] border-terracotta',
                )}
              >
                {selected && <Check aria-hidden="true" className="h-4 w-4 text-wood-dark" />}
              </span>
              <span className="min-w-0">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />
      <Button variant="accent" size="lg" className="w-full" onClick={onNext} disabled={value === undefined}>
        Siguiente
      </Button>
    </section>
  );
};

export default GiftQuestion;
