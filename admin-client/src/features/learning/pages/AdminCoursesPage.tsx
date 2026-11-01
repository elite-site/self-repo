import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GraduationCap, BookOpen, CheckCircle, Sparkles } from 'lucide-react';
import { CourseTable } from '../components/CourseTable';
import { CourseFormModal } from '../components/CourseFormModal';
import { useAdminCoursesQuery, useCreateCourseMutation, useDeleteCourseMutation } from '../hooks/useAdminCourses';
import { AdminCourseItem } from '../types';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

export const AdminCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useAdminCoursesQuery({ search: search.trim() || undefined, page, limit: 10 });
  const createMutation = useCreateCourseMutation();
  const deleteMutation = useDeleteCourseMutation();

  const handleCreate = async (payload: Partial<AdminCourseItem>) => {
    try {
      await createMutation.mutateAsync(payload);
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to create course', err);
    }
  };

  const handleDelete = async (course: AdminCourseItem) => {
    if (window.confirm(`Are you sure you want to delete "${course.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(course.id);
      } catch (err) {
        console.error('Failed to delete course', err);
      }
    }
  };

  const courses = data?.courses ?? [];
  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT').length;
  const totalEnrollments = courses.reduce((sum, c) => sum + (c.enrollmentCount ?? 0), 0);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <GraduationCap size={13} className="shrink-0" />
                <span>Curriculum & Learning Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-ink">
                LearningHub Courses
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                Manage courses, curricula, video lessons, quizzes, and assignment enrollments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn btn-primary text-xs sm:text-sm min-h-[40px] px-4 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Course</span>
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Published Courses</span>
              <span className="text-2xl font-bold text-status-approved tabular-nums">{publishedCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Draft Curricula</span>
              <span className="text-2xl font-bold text-ink tabular-nums">{draftCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover col-span-2 sm:col-span-1">
              <span className="text-xs text-ink-muted block font-medium">Active Enrollments</span>
              <span className="text-2xl font-bold text-brand tabular-nums">{totalEnrollments}</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <BookOpen size={13} />
                  Syllabus Operations
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {courses.length} Active
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Self-Paced Engineering Modules</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Courses support embedded YouTube playlists, lesson completion tracking, and automated certification quizzes.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Enrolled Students</span>
                  <span className="font-bold text-ink text-sm tabular-nums">{totalEnrollments}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Catalog Status</span>
                  <span className="font-bold text-status-approved text-sm">Live</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <CheckCircle size={14} className="text-brand shrink-0" />
              <span>Full curriculum analytics synchronized</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. TABLE / CONTENT */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-muted">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading courses...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-12 surface rounded-xl border border-edge text-center gap-3" role="alert">
          <p className="text-xs text-status-rejected font-medium">
            {(error as any)?.message || 'Failed to load courses. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="btn btn-secondary text-xs cursor-pointer shadow-xs"
          >
            Retry
          </button>
        </div>
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

export default AdminCoursesPage;
