import React from 'react';
import { User, ArrowLeft } from 'lucide-react';

export const StudentDetail: React.FC<{ student?: any; onBack?: () => void }> = ({ student, onBack }) => {
  if (!student) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <User className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No Student Selected</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Select a student record from the roster to view complete academic profile details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Roster
        </button>
      )}

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-elite-red/10 text-elite-red flex items-center justify-center text-xl font-bold">
            {student.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{student.name}</h2>
            <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
              Roll No: {student.rollNo} • Year {student.year} Section {student.section} • {student.branch}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
