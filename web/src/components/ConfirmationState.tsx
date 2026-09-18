import React from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface ConfirmationStateProps {
  studentName: string;
  submissionId: string;
  onReset: () => void;
}

export const ConfirmationState: React.FC<ConfirmationStateProps> = ({
  studentName,
  submissionId,
  onReset,
}) => {
  return (
    <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-6 my-8 animate-in fade-in duration-200">
      <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
          APPLICATION SUBMITTED
        </span>
        <h2 className="text-3xl font-extrabold text-elite-black font-display tracking-tight">
          Thank you, {studentName}!
        </h2>
        <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
          Your self introduction for <strong className="text-elite-red font-semibold">ELITE Self Introduction</strong> has been received successfully.
        </p>
      </div>

      {submissionId && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 max-w-xs mx-auto">
          <p className="text-[11px] text-neutral-400 uppercase font-semibold">Application Reference ID</p>
          <p className="text-xs font-mono font-bold text-elite-black mt-0.5">{submissionId}</p>
        </div>
      )}

      <div className="pt-4 border-t border-neutral-100">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Submit Another Introduction</span>
        </button>
      </div>
    </div>
  );
};
