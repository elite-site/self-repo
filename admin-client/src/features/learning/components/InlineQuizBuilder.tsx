import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdminQuizItem, AdminQuizQuestionItem, QuizQuestionType, QuizShowAnswers } from '../types';

export interface InlineQuizBuilderProps {
  quiz?: AdminQuizItem | null;
  lessonId: string;
  courseId: string;
  onSave: (quiz: AdminQuizItem) => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

export const InlineQuizBuilder: React.FC<InlineQuizBuilderProps> = ({
  quiz, lessonId, courseId, onSave, onCancel, isSaving = false,
}) => {
  const [passPercent, setPassPercent] = useState(quiz?.passPercent ?? 70);
  const [timeLimitMin, setTimeLimitMin] = useState<number | null>(quiz?.timeLimitMin ?? 15);
  const [maxAttempts, setMaxAttempts] = useState(quiz?.maxAttempts ?? 3);
  const [showAnswers, setShowAnswers] = useState<QuizShowAnswers>(quiz?.showAnswers ?? 'AFTER_SUBMIT');
  const [questions, setQuestions] = useState<AdminQuizQuestionItem[]>(
    quiz?.questions?.length
      ? quiz.questions
      : [{ order: 1, type: 'SINGLE', text: '', points: 1, options: [{ order: 1, text: '', isCorrect: true }] }]
  );

  const addQuestion = () => {
    setQuestions([...questions, { order: questions.length + 1, type: 'SINGLE', text: '', points: 1, options: [{ order: 1, text: '', isCorrect: true }] }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 })));
  };

  const updateQuestion = (idx: number, patch: Partial<AdminQuizQuestionItem>) => {
    setQuestions(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const addOption = (qIdx: number) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: [...q.options, { order: q.options.length + 1, text: '', isCorrect: false }] });
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: q.options.filter((_, i) => i !== optIdx).map((o, i) => ({ ...o, order: i + 1 })) });
  };

  const updateOption = (qIdx: number, optIdx: number, text: string, isCorrect: boolean) => {
    const q = questions[qIdx];
    const newOptions = q.options.map((opt, i) => {
      if (i === optIdx) return { ...opt, text, isCorrect };
      if (isCorrect && q.type === 'SINGLE') return { ...opt, isCorrect: false };
      return opt;
    });
    updateQuestion(qIdx, { options: newOptions });
  };

  return (
    <div className="surface border border-edge rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-edge pb-3">
        <h3 className="font-heading font-semibold text-ink text-sm">Lesson Quiz Builder</h3>
        <span className="text-xs text-ink-muted">{questions.length} Question(s)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Pass %</label>
          <input type="number" min={0} max={100} value={passPercent} onChange={(e) => setPassPercent(Number(e.target.value))} className="input text-xs" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Time Limit (min)</label>
          <input type="number" min={0} value={timeLimitMin ?? ''} onChange={(e) => setTimeLimitMin(e.target.value ? Number(e.target.value) : null)} className="input text-xs" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Max Attempts</label>
          <input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className="input text-xs" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Show Answers</label>
          <select value={showAnswers} onChange={(e) => setShowAnswers(e.target.value as QuizShowAnswers)} className="select text-xs">
            <option value="NEVER">Never</option><option value="AFTER_SUBMIT">After Submit</option><option value="AFTER_DEADLINE">After Deadline</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-surface-inset border border-edge rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink">Q{qIdx + 1}</span>
              <div className="flex items-center gap-2">
                <select value={q.type} onChange={(e) => updateQuestion(qIdx, { type: e.target.value as QuizQuestionType })} className="select text-xs py-0.5">
                  <option value="SINGLE">Single Choice</option><option value="MULTI">Multi Choice</option><option value="TRUE_FALSE">True / False</option>
                </select>
                <input type="number" min={1} value={q.points} onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value) })} className="input text-xs w-16 py-0.5" title="Points" />
                <button type="button" onClick={() => removeQuestion(qIdx)} className="btn btn-ghost p-1 text-status-rejected" title="Delete question"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <input value={q.text} onChange={(e) => updateQuestion(qIdx, { text: e.target.value })} placeholder="Question prompt..." className="input text-xs" />
            <div className="space-y-1.5 pl-2">
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={opt.isCorrect} onChange={(e) => updateOption(qIdx, optIdx, opt.text, e.target.checked)} className="rounded border-edge" />
                    <span className="text-xs text-ink-muted">Correct</span>
                  </label>
                  <input value={opt.text} onChange={(e) => updateOption(qIdx, optIdx, e.target.value, opt.isCorrect)} placeholder={`Option ${optIdx + 1}`} className="input text-xs flex-1 py-0.5" />
                  <button type="button" onClick={() => removeOption(qIdx, optIdx)} className="btn btn-ghost p-1 text-ink-muted hover:text-status-rejected"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button type="button" onClick={() => addOption(qIdx)} className="text-xs text-brand hover:underline inline-flex items-center gap-1 mt-1"><Plus className="w-3 h-3" /> Add Option</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-edge">
        <button type="button" onClick={addQuestion} className="btn btn-secondary text-xs inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Question</button>
        <div className="flex gap-2">
          {onCancel && <button type="button" onClick={onCancel} className="btn btn-secondary text-xs">Cancel</button>}
          <button type="button" disabled={isSaving} onClick={() => onSave({ id: quiz?.id, courseId, lessonId, passPercent, timeLimitMin, maxAttempts, showAnswers, questions })} className="btn btn-primary text-xs disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};
