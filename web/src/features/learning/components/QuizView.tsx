import React, { useState, useEffect, useMemo } from 'react';
import { Timer, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { QuizDetailResponse, QuizAttemptResult } from '../types';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { cn } from '@/shared/lib/cn';

export interface QuizViewProps {
  quiz: QuizDetailResponse;
  startedAt?: string;
  onSubmit: (answers: Array<{ questionId: string; selectedOptionIds: string[] }>) => Promise<QuizAttemptResult>;
  initialResult?: QuizAttemptResult | null;
  className?: string;
}

export const QuizView: React.FC<QuizViewProps> = ({
  quiz,
  startedAt,
  onSubmit,
  initialResult = null,
  className,
}) => {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(initialResult);
  const [timeLeft, setTimeLeft] = useState<number | null>(() => {
    if (!quiz.timeLimitMin || !startedAt) return null;
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(0, quiz.timeLimitMin * 60 - elapsed);
  });

  useEffect(() => {
    if (result || timeLeft === null) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev === null || prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [result, timeLeft]);

  const handleSelectOption = (questionId: string, optionId: string, isMulti: boolean) => {
    if (result) return;
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      const next = isMulti
        ? current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
        : [optionId];
      return { ...prev, [questionId]: next };
    });
  };

  const allAnswered = useMemo(() => {
    return quiz.questions.length > 0 && quiz.questions.every((q) => (answers[q.id]?.length ?? 0) > 0);
  }, [quiz.questions, answers]);

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    try {
      const payload = quiz.questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers[q.id] || [] }));
      const res = await onSubmit(payload);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  const reviewMap = useMemo(() => {
    const map = new Map<string, NonNullable<QuizAttemptResult['answersReview']>[number]>();
    result?.answersReview?.forEach((r) => map.set(r.questionId, r));
    return map;
  }, [result]);

  return (
    <div className={cn('surface rounded-xl border border-edge p-6 space-y-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge pb-4">
        <div>
          <h3 className="text-xl font-bold text-ink">Quiz Assessment</h3>
          <p className="text-xs text-ink-muted">Passing score: {quiz.passPercent}% · {quiz.questions.length} questions</p>
        </div>
        {timeLeft !== null && !result && (
          <div className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-semibold', timeLeft < 60 ? 'bg-danger-subtle text-danger' : 'bg-surface-sunken text-ink')}>
            <Timer className="size-4" aria-hidden="true" />
            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
        {result && (
          <div className="flex items-center gap-2">
            <Badge label={result.passed ? 'Passed' : 'Needs Retake'} variant={result.passed ? 'success' : 'danger'} />
            <span className="text-sm font-bold text-ink">{result.score}/{result.maxScore} ({result.scorePercent}%)</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q, idx) => {
          const rev = reviewMap.get(q.id);
          const sel = answers[q.id] || rev?.selectedOptionIds || [];
          return (
            <div key={q.id} className="rounded-lg border border-edge bg-surface-raised p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{idx + 1}. {q.text}</span>
                <span className="text-xs text-ink-muted shrink-0">{q.points} pts</span>
              </div>
              <div className="grid gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() => handleSelectOption(q.id, opt.id, q.type === 'MULTI')}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                      sel.includes(opt.id) ? 'border-brand bg-brand-soft/20 font-medium text-ink' : 'border-edge bg-surface text-ink-secondary hover:bg-surface-sunken',
                      result && rev?.correctOptionIds?.includes(opt.id) && 'border-success bg-success-subtle text-success',
                    )}
                  >
                    <span>{opt.text}</span>
                    {result && sel.includes(opt.id) && (rev?.isCorrect ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />)}
                  </button>
                ))}
              </div>
              {rev?.explanation && (
                <div className="flex items-start gap-1.5 rounded bg-surface-sunken p-2.5 text-xs text-ink-secondary">
                  <AlertCircle className="size-4 text-info shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{rev.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!result && (
        <div className="pt-2 flex justify-end">
          <Button variant="primary" disabled={!allAnswered || submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuizView;
