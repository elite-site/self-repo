import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Edit3 } from 'lucide-react';
import { useAdminCourseDetailQuery, useAddLessonMutation, useUpdateLessonMutation, useDeleteLessonMutation, useReorderLessonsMutation } from '../hooks/useAdminLessons';
import { useUpdateCourseMutation } from '../hooks/useAdminCourses';
import { useSaveQuizMutation } from '../hooks/useAdminQuiz';
import { CourseFormModal } from '../components/CourseFormModal';
import { LessonListEditor } from '../components/LessonListEditor';
import { AssignModal } from '../components/AssignModal';
import { InlineQuizBuilder } from '../components/InlineQuizBuilder';
import { AdminLessonItem } from '../types';

export const AdminCourseEditPage: React.FC = () => {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [quizLesson, setQuizLesson] = useState<AdminLessonItem | null>(null);

  const { data: course, isLoading } = useAdminCourseDetailQuery(courseId);
  const updateCourseMutation = useUpdateCourseMutation();
  const addLessonMutation = useAddLessonMutation(courseId);
  const updateLessonMutation = useUpdateLessonMutation(courseId);
  const deleteLessonMutation = useDeleteLessonMutation(courseId);
  const reorderLessonsMutation = useReorderLessonsMutation(courseId);
  const saveQuizMutation = useSaveQuizMutation(courseId);

  if (isLoading || !course) {
    return <div className="p-8 text-center text-xs text-ink-muted">Loading course details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/admin/learning')} className="btn btn-ghost p-1.5" aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-heading font-bold text-ink">{course.title}</h1>
            <p className="text-xs text-ink-muted">{course.category || 'General'} • {course.level || 'Beginner'} • {course.status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setCourseModalOpen(true)} className="btn btn-secondary text-xs inline-flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Edit Metadata
          </button>
          <button type="button" onClick={() => setAssignModalOpen(true)} className="btn btn-primary text-xs inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Assign Course
          </button>
        </div>
      </div>

      <div className="surface border border-edge rounded-xl p-4">
        <h2 className="text-sm font-semibold text-ink mb-1">Course Overview</h2>
        <p className="text-xs text-ink-secondary mb-3">{course.description || 'No description provided.'}</p>
        <div className="flex flex-wrap gap-4 text-xs text-ink-muted border-t border-edge pt-2">
          <span>Slug: <strong className="text-ink">{course.slug}</strong></span>
          <span>Hours: <strong className="text-ink">{course.estimatedHours ?? '—'}h</strong></span>
          <span>Enrolment: <strong className="text-ink">{course.enrolment}</strong></span>
          <span>Enrolled: <strong className="text-ink">{course.enrollmentCount}</strong></span>
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
