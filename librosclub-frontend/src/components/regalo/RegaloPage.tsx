import React, { useEffect, useRef, useState } from 'react';
import { ApiError, giftAPI } from '@/utils/api';
import type { GiftAnswers, GiftErrorKind, GiftResponse } from '@/lib/gift-contract';
import { GIFT_QUESTIONS, recipientFor } from '@/lib/gift-test';
import GiftIntro from './GiftIntro';
import GiftQuestion from './GiftQuestion';
import GiftLoading from './GiftLoading';
import GiftError from './GiftError';
import GiftResult from './GiftResult';

type Screen = 'intro' | 'question' | 'loading' | 'result' | 'error';

const LAST_STEP = GIFT_QUESTIONS.length - 1;
const MIN_LOADING_MS = 1500;
const ERROR_KINDS: readonly GiftErrorKind[] = ['invalid', 'rate_limited', 'unavailable', 'network'];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const errorKindOf = (error: unknown): GiftErrorKind =>
  error instanceof ApiError && ERROR_KINDS.includes(error.code as GiftErrorKind)
    ? (error.code as GiftErrorKind)
    : 'network';

const isComplete = (answers: Partial<GiftAnswers>): answers is GiftAnswers =>
  GIFT_QUESTIONS.every((question) => answers[question.field] !== undefined);

const RegaloPage: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<GiftAnswers>>({});
  const [result, setResult] = useState<GiftResponse | null>(null);
  const [errorKind, setErrorKind] = useState<GiftErrorKind | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const question = GIFT_QUESTIONS[step];
  const recipient = answers.relationship ? recipientFor(answers.relationship) : undefined;

  const submit = async (payload: GiftAnswers) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setScreen('loading');

    const [outcome] = await Promise.allSettled([
      giftAPI.getRecommendations(payload, { signal: controller.signal }),
      delay(MIN_LOADING_MS),
    ]);
    if (controller.signal.aborted) return;

    if (outcome.status === 'fulfilled') {
      setResult(outcome.value);
      setErrorKind(null);
      setScreen('result');
    } else {
      setErrorKind(errorKindOf(outcome.reason));
      setScreen('error');
    }
  };

  const start = () => {
    setAnswers({});
    setResult(null);
    setErrorKind(null);
    setStep(0);
    setScreen('question');
  };

  const restart = () => {
    setAnswers({});
    setResult(null);
    setErrorKind(null);
    setStep(0);
    setScreen('intro');
  };

  const select = (value: string) => {
    setAnswers((current) => ({ ...current, [question.field]: value }));
  };

  const next = () => {
    if (step < LAST_STEP) {
      setStep(step + 1);
      return;
    }
    if (isComplete(answers)) void submit(answers);
  };

  const back = () => {
    if (step === 0) {
      setScreen('intro');
      return;
    }
    setStep(step - 1);
  };

  const retry = () => {
    if (isComplete(answers)) void submit(answers);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background px-4 py-10 text-foreground">
        {screen === 'intro' && <GiftIntro onStart={start} />}
        {screen === 'question' && (
          <GiftQuestion
            step={step}
            question={question}
            value={answers[question.field]}
            recipient={recipient}
            onSelect={select}
            onNext={next}
            onBack={back}
          />
        )}
        {screen === 'loading' && <GiftLoading recipient={recipient ?? recipientFor('otro')} />}
        {screen === 'error' && errorKind && <GiftError kind={errorKind} onRetry={retry} onRestart={restart} />}
        {screen === 'result' && result && <GiftResult result={result} onRestart={restart} />}
      </main>
    </div>
  );
};

export default RegaloPage;
