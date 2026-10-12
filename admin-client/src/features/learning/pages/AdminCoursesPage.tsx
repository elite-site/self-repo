import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GraduationCap } from 'lucide-react';
import { CourseTable } from '../components/CourseTable';
import { CourseFormModal } from '../components/CourseFormModal';
import { useAdminCoursesQuery, useCreateCourseMutation, useDeleteCourseMutation } from '../hooks/useAdminCourses';
import { AdminCourseItem } from '../types';

export const AdminCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useAdminCoursesQuery({ search: search.trim() || undefined, page, limit: 10 });
  const createMutation = useCreateCourseMutation();
  const deleteMutation = useDeleteCourseMutation();

  const handleCreate = async (payload: Partial<AdminCourseItem>) => {
    await createMutation.mutateAsync(payload);
    setModalOpen(false);
  };

  const handleDelete = async (course: AdminCourseItem) => {
    if (window.confirm(`Are you sure you want to delete "${course.title}"?`)) {
      await deleteMutation.mutateAsync(course.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand" /> LearningHub Courses
          </h1>
          <p className="text-xs text-ink-muted mt-1">Manage courses, curricula, quizzes, and assignments</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn btn-primary text-sm inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Course
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-muted">Loading courses...</div>
      ) : (
        <CourseTable
          courses={data?.courses ?? []}
          search={search}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          page={page}
          totalPages={data?.pagination?.totalPages ?? 1}
          onPageChange={setPage}
          onEdit={(c) => navigate(`/admin/learning/courses/${c.id}/edit`)}
          onReports={(c) => navigate(`/admin/learning/courses/${c.id}/reports`)}
          onEnrollments={(c) => navigate(`/admin/learning/courses/${c.id}/enrollments`)}
          onDelete={handleDelete}
        />
      )}

      <CourseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
};
