import React, { useState } from 'react';
import { Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { TargetType } from '../types';
import { learningAdminApi } from '../api';

export interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle?: string;
  onAssigned?: (count?: number) => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  open, onClose, courseId, courseTitle, onAssigned,
}) => {
  const [targetType, setTargetType] = useState<TargetType>('ALL');
  const [studentIdsInput, setStudentIdsInput] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [section, setSection] = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMsg(null); setLoading(true);
    try {
      let payload: { targetType: TargetType; studentIds?: string[]; year?: number; section?: string };
      if (targetType === 'STUDENT') {
        const studentIds = studentIdsInput.split(/[\s,]+/).filter(Boolean);
        if (!studentIds.length) {
          setError('Please provide at least one student ID.');
          setLoading(false);
          return;
        }
        payload = { targetType: 'STUDENT', studentIds };
      } else if (targetType === 'BATCH') {
        payload = { targetType: 'BATCH', year: Number(year), section };
      } else {
        payload = { targetType: 'ALL' };
      }
      const res = await learningAdminApi.assignCourse(courseId, payload);
      setSuccessMsg(`Successfully assigned course! (${res.count ?? 'all'} enrolled)`);
      onAssigned?.(res.count);
      setTimeout(() => { onClose(); setSuccessMsg(null); }, 1000);
    } catch {
      setError('Failed to assign course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Assign Course" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {courseTitle && (
          <p className="text-xs text-ink-muted">Assigning: <strong className="text-ink">{courseTitle}</strong></p>
        )}
        <div>
          <label htmlFor="assign-target-type" className="block text-xs font-medium text-ink-muted mb-1">Target Audience</label>
          <select id="assign-target-type" value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)} className="select text-sm">
            <option value="ALL">All Students</option>
            <option value="STUDENT">Specific Students</option>
            <option value="BATCH">Specific Batch & Section</option>
          </select>
        </div>
        {targetType === 'STUDENT' && (
          <div>
            <label htmlFor="assign-student-ids" className="block text-xs font-medium text-ink-muted mb-1">Student IDs</label>
            <textarea id="assign-student-ids" rows={3} value={studentIdsInput} onChange={(e) => setStudentIdsInput(e.target.value)} placeholder="Enter Student IDs (comma or newline separated)..." className="textarea text-sm" />
            <span className="text-xs text-ink-muted">e.g. stu_101, stu_102</span>
          </div>
        )}
        {targetType === 'BATCH' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="assign-batch-year" className="block text-xs font-medium text-ink-muted mb-1">Batch Year</label>
              <select id="assign-batch-year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="select text-sm">
                {[2024, 2025, 2026, 2027, 2028].map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="assign-section" className="block text-xs font-medium text-ink-muted mb-1">Section</label>
              <select id="assign-section" value={section} onChange={(e) => setSection(e.target.value)} className="select text-sm">
                {['A', 'B', 'C', 'D'].map((s) => (<option key={s} value={s}>Section {s}</option>))}
              </select>
            </div>
          </div>
        )}
        {error && <div className="text-xs text-status-rejected flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {successMsg && <div className="text-xs text-status-approved flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> {successMsg}</div>}
        <div className="flex justify-end gap-2 pt-3 border-t border-edge">
          <button type="button" onClick={onClose} className="btn btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary text-sm disabled:opacity-50 inline-flex items-center gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
            Assign Course
          </button>
        </div>
      </form>
    </Dialog>
  );
};
