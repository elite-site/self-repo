import React, { useState } from 'react';
import { Video, ExternalLink, FileText, HelpCircle, ArrowUp, ArrowDown, Edit2, Trash2, Plus } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { AdminLessonItem, LessonType } from '../types';

export interface LessonListEditorProps {
  lessons: AdminLessonItem[];
  onReorder: (lessonIds: string[]) => void;
  onAddLesson: (lesson: Partial<AdminLessonItem>) => void | Promise<void>;
  onEditLesson: (lessonId: string, lesson: Partial<AdminLessonItem>) => void | Promise<void>;
  onDeleteLesson: (lessonId: string) => void | Promise<void>;
  onOpenQuizBuilder?: (lesson: AdminLessonItem) => void;
}

const typeIcon = (type: LessonType) => {
  if (type === 'YOUTUBE') return <span className="badge badge-draft"><Video className="w-3 h-3" /> YouTube</span>;
  if (type === 'LINK') return <span className="badge badge-draft"><ExternalLink className="w-3 h-3" /> Link</span>;
  if (type === 'NOTES') return <span className="badge badge-draft"><FileText className="w-3 h-3" /> Notes</span>;
  return <span className="badge badge-approved"><HelpCircle className="w-3 h-3" /> Quiz</span>;
};

export const LessonListEditor: React.FC<LessonListEditorProps> = ({
  lessons, onReorder, onAddLesson, onEditLesson, onDeleteLesson, onOpenQuizBuilder,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<AdminLessonItem | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LessonType>('YOUTUBE');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [durationSec, setDurationSec] = useState('');

  const openModal = (lesson?: AdminLessonItem) => {
    setEditingLesson(lesson ?? null);
    setTitle(lesson?.title ?? '');
    setType(lesson?.type ?? 'YOUTUBE');
    setUrl(lesson?.url || lesson?.youtubeVideoId || '');
    setNotes(lesson?.notes || '');
    setDurationSec(lesson?.durationSec != null ? String(lesson?.durationSec) : '');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const data: Partial<AdminLessonItem> = {
      title: title.trim(), type, durationSec: durationSec ? Number(durationSec) : null,
      notes: type === 'NOTES' ? notes.trim() : null, url: type === 'LINK' ? url.trim() : null,
      youtubeVideoId: type === 'YOUTUBE' ? url.trim() : null,
      order: editingLesson ? editingLesson.order : lessons.length + 1,
    };
    if (editingLesson) onEditLesson(editingLesson.id, data);
    else onAddLesson(data);
    setModalOpen(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= lessons.length) return;
    const reordered = [...lessons];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(target, 0, moved);
    onReorder(reordered.map((l) => l.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Course Lessons ({lessons.length})</h3>
        <button type="button" onClick={() => openModal()} className="btn btn-primary px-2.5 py-1 text-xs inline-flex items-center gap-1 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Lesson
        </button>
      </div>

      <div className="divide-y divide-edge border border-edge rounded-lg surface overflow-hidden">
        {lessons.length === 0 ? (
          <div className="p-4 text-center text-xs text-ink-muted">No lessons yet. Add one above.</div>
        ) : (
          lessons.map((lesson, idx) => (
            <div key={lesson.id} className="p-3 flex items-center justify-between gap-3 hover:bg-surface-sunken">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-ink-muted w-5">{idx + 1}.</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{lesson.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {typeIcon(lesson.type)}
                    {lesson.durationSec && <span className="text-xs text-ink-muted">{Math.round(lesson.durationSec / 60)} min</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {lesson.type === 'QUIZ' && onOpenQuizBuilder && (
                  <button type="button" onClick={() => onOpenQuizBuilder(lesson)} className="btn btn-ghost px-2 py-1 text-xs text-brand font-medium">Quiz</button>
                )}
                <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)} className="btn btn-ghost p-1 text-xs disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button type="button" disabled={idx === lessons.length - 1} onClick={() => move(idx, 1)} className="btn btn-ghost p-1 text-xs disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => openModal(lesson)} className="btn btn-ghost p-1 text-xs" aria-label="Edit lesson"><Edit2 className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => onDeleteLesson(lesson.id)} className="btn btn-ghost p-1 text-xs text-status-rejected" aria-label="Delete lesson"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={editingLesson ? 'Edit Lesson' : 'Add Lesson'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="l-title">Lesson Title *</label>
            <input id="l-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="input text-sm" placeholder="e.g. Introduction" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="l-type">Type</label>
              <select id="l-type" value={type} onChange={(e) => setType(e.target.value as LessonType)} className="select text-sm">
                <option value="YOUTUBE">YouTube</option><option value="LINK">Link</option><option value="NOTES">Notes</option><option value="QUIZ">Quiz</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="l-dur">Duration (sec)</label>
              <input id="l-dur" type="number" value={durationSec} onChange={(e) => setDurationSec(e.target.value)} className="input text-sm" placeholder="600" />
            </div>
          </div>
          {type === 'NOTES' ? (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="l-notes">Notes (Markdown)</label>
              <textarea id="l-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="textarea text-sm" rows={3} />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="l-url">{type === 'YOUTUBE' ? 'YouTube URL or Video ID' : 'Resource URL'}</label>
              <input id="l-url" value={url} onChange={(e) => setUrl(e.target.value)} className="input text-sm" placeholder="https://..." />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-edge">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn btn-primary text-xs">Save</button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
