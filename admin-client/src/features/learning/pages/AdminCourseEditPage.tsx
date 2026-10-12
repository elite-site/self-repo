import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Edit3, Calendar, Sparkles } from 'lucide-react';
import {
  useAdminCourseDetailQuery,
  useAddLessonMutation,
  useBulkAddLessonsMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useReorderLessonsMutation,
} from '../hooks/useAdminLessons';
import { useUpdateCourseMutation } from '../hooks/useAdminCourses';
import { useSaveQuizMutation } from '../hooks/useAdminQuiz';
import { CourseFormModal } from '../components/CourseFormModal';
import { LessonListEditor } from '../components/LessonListEditor';
import { AssignModal } from '../components/AssignModal';
import { InlineQuizBuilder } from '../components/InlineQuizBuilder';
import { AdminLessonItem } from '../types';

export const AdminCourseEditPage: React.FC = () => {
  const { id: paramId, courseId: paramCourseId } = useParams<{ id?: string; courseId?: string }>();
  const courseId = paramId || paramCourseId || '';
  const navigate = useNavigate();
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [quizLesson, setQuizLesson] = useState<AdminLessonItem | null>(null);

  const { data: course, isLoading } = useAdminCourseDetailQuery(courseId);
  const updateCourseMutation = useUpdateCourseMutation();
  const addLessonMutation = useAddLessonMutation(courseId);
  const bulkAddLessonsMutation = useBulkAddLessonsMutation(courseId);
  const updateLessonMutation = useUpdateLessonMutation(courseId);
  const deleteLessonMutation = useDeleteLessonMutation(courseId);
  const reorderLessonsMutation = useReorderLessonsMutation(courseId);
  const saveQuizMutation = useSaveQuizMutation(courseId);

  if (isLoading || !course) {
    return <div className="p-8 text-center text-xs text-ink-muted">Loading course details...</div>;
  }

  const isOverdue = course.dueAt && new Date(course.dueAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/admin/learning')} className="btn btn-ghost p-1.5" aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-heading font-bold text-ink">{course.title}</h1>
            <p className="text-xs text-ink-muted">
              {course.category || 'General'} • {course.level || 'Beginner'} • <span className="font-semibold">{course.status}</span>
              {course.instructor && ` • Instructor: ${course.instructor}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setCourseModalOpen(true)} className="btn btn-secondary text-xs inline-flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Edit Metadata & Options
          </button>
          <button type="button" onClick={() => setAssignModalOpen(true)} className="btn btn-primary text-xs inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Assign Course
          </button>
        </div>
      </div>

      <div className="surface border border-edge rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-ink mb-1">Course Overview</h2>
            <p className="text-xs text-ink-secondary leading-relaxed">{course.description || 'No description provided.'}</p>
          </div>
          {course.thumbnailUrl && (
            <img src={course.thumbnailUrl} alt={course.title} className="w-32 h-20 object-cover rounded-lg border border-edge shrink-0" />
          )}
        </div>

        {course.skills && course.skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1"><Sparkles className="w-3 h-3 text-brand" /> Skills:</span>
            {course.skills.map((s, i) => (
              <span key={i} className="badge badge-draft text-[11px] font-mono">{s}</span>
            ))}
          </div>
        )}

        {(course.outcomes || course.prerequisites) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-edge text-xs">
            {course.outcomes && (
              <div>
                <strong className="text-ink font-semibold block mb-0.5">What Students Will Learn:</strong>
                <p className="text-ink-muted whitespace-pre-line text-[11px]">{course.outcomes}</p>
              </div>
            )}
            {course.prerequisites && (
              <div>
                <strong className="text-ink font-semibold block mb-0.5">Prerequisites:</strong>
                <p className="text-ink-muted whitespace-pre-line text-[11px]">{course.prerequisites}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted border-t border-edge pt-2">
          <span>Slug: <strong className="text-ink">{course.slug}</strong></span>
          <span>Hours: <strong className="text-ink">{course.estimatedHours ?? '—'}h</strong></span>
          <span>Enrolment: <strong className="text-ink">{course.enrolment}</strong></span>
          <span>Enrolled: <strong className="text-ink">{course.enrollmentCount}</strong></span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Deadline: {course.dueAt ? (
              <strong className={isOverdue ? 'text-status-rejected font-semibold' : 'text-ink'}>
                {new Date(course.dueAt).toLocaleString()} {isOverdue && '(Overdue)'}
              </strong>
            ) : (
              <span>No deadline set</span>
            )}
          </span>
        </div>
      </div>

      {quizLesson ? (
        <InlineQuizBuilder
          quiz={quizLesson.quiz}
          lessonId={quizLesson.id}
          courseId={courseId}
          onSave={async (q) => { await saveQuizMutation.mutateAsync(q); setQuizLesson(null); }}
          onCancel={() => setQuizLesson(null)}
          isSaving={saveQuizMutation.isPending}
        />
      ) : (
        <LessonListEditor
          lessons={course.lessons ?? []}
          onReorder={(ids) => reorderLessonsMutation.mutate(ids)}
          onAddLesson={(data) => addLessonMutation.mutate(data)}
          onBulkAddLessons={async (lessons) => { await bulkAddLessonsMutation.mutateAsync(lessons); }}
          onEditLesson={(id, data) => updateLessonMutation.mutate({ lessonId: id, data })}
          onDeleteLesson={(id) => deleteLessonMutation.mutate(id)}
          onOpenQuizBuilder={(lesson) => setQuizLesson(lesson)}
        />
      )}

      <CourseFormModal
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        course={course}
        onSubmit={async (data) => { await updateCourseMutation.mutateAsync({ id: course.id, data }); setCourseModalOpen(false); }}
        isSubmitting={updateCourseMutation.isPending}
      />
      <AssignModal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} courseId={course.id} courseTitle={course.title} />
    </div>
  );
};

export default AdminCourseEditPage;
