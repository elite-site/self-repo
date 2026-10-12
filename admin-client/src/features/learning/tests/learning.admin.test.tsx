import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CourseTable } from '../components/CourseTable';
import { ReportsView } from '../components/ReportsView';
import { AssignModal } from '../components/AssignModal';
import { AdminCourseItem, AdminLearningReport } from '../types';
import { learningAdminApi } from '../api';

const mockCourses: AdminCourseItem[] = [
  {
    id: 'course-1',
    title: 'Modern TypeScript Architecture',
    slug: 'modern-typescript-architecture',
    description: 'Clean code & layered architecture.',
    thumbnailUrl: null,
    category: 'Backend',
    level: 'INTERMEDIATE',
    estimatedHours: 4,
    status: 'PUBLISHED',
    enrolment: 'OPEN',
    featured: true,
    dueAt: null,
    lessonCount: 5,
    enrollmentCount: 42,
    completionCount: 18,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'course-2',
    title: 'React 18 Essentials',
    slug: 'react-18-essentials',
    description: 'UI primitives and hooks.',
    thumbnailUrl: null,
    category: 'Frontend',
    level: 'BEGINNER',
    estimatedHours: 2,
    status: 'DRAFT',
    enrolment: 'ASSIGNED_ONLY',
    featured: false,
    dueAt: null,
    lessonCount: 3,
    enrollmentCount: 10,
    completionCount: 2,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
  },
];

const mockReport: AdminLearningReport = {
  courseId: 'course-1',
  courseTitle: 'Modern TypeScript Architecture',
  totalEnrolled: 42,
  completedCount: 18,
  completionRate: 42.8,
  averageProgress: 65.4,
  quizStats: {
    totalAttempts: 55,
    averageScore: 82.5,
    passRate: 78.2,
  },
  studentProgress: [
    {
      id: 'enr-1',
      studentId: 'stu-1',
      studentName: 'Alex Mercer',
      studentRollNo: 'CS202601',
      studentEmail: 'alex@example.com',
      source: 'SELF',
      status: 'COMPLETED',
      progressPercent: 100,
      enrolledAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-05T00:00:00.000Z',
      lastAccessedAt: '2026-01-05T00:00:00.000Z',
    },
    {
      id: 'enr-2',
      studentId: 'stu-2',
      studentName: 'Dana Scully',
      studentRollNo: 'CS202602',
      studentEmail: 'dana@example.com',
      source: 'ASSIGNED',
      status: 'ACTIVE',
      progressPercent: 45,
      enrolledAt: '2026-01-02T00:00:00.000Z',
      completedAt: null,
      lastAccessedAt: '2026-01-06T00:00:00.000Z',
    },
  ],
};

describe('CourseTable Component', () => {
  it('renders table headers and course data properly', () => {
    const onSearchChange = vi.fn();
    const onPageChange = vi.fn();
    const onEdit = vi.fn();
    const onReports = vi.fn();
    const onEnrollments = vi.fn();
    const onDelete = vi.fn();

    render(
      <CourseTable
        courses={mockCourses}
        search=""
        onSearchChange={onSearchChange}
        page={1}
        totalPages={2}
        onPageChange={onPageChange}
        onEdit={onEdit}
        onReports={onReports}
        onEnrollments={onEnrollments}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Modern TypeScript Architecture')).toBeInTheDocument();
    expect(screen.getByText('React 18 Essentials')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('handles search input and action button clicks', () => {
    const onSearchChange = vi.fn();
    const onEdit = vi.fn();
    const onReports = vi.fn();
    const onEnrollments = vi.fn();
    const onDelete = vi.fn();

    render(
      <CourseTable
        courses={mockCourses}
        search=""
        onSearchChange={onSearchChange}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onEdit={onEdit}
        onReports={onReports}
        onEnrollments={onEnrollments}
        onDelete={onDelete}
      />
    );

    const searchInput = screen.getByLabelText('Search courses');
    fireEvent.change(searchInput, { target: { value: 'TypeScript' } });
    expect(onSearchChange).toHaveBeenCalledWith('TypeScript');

    const editBtn = screen.getByLabelText('Edit Modern TypeScript Architecture');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(mockCourses[0]);

    const reportsBtn = screen.getByLabelText('Reports for Modern TypeScript Architecture');
    fireEvent.click(reportsBtn);
    expect(onReports).toHaveBeenCalledWith(mockCourses[0]);

    const enrollmentsBtn = screen.getByLabelText('Enrollments for Modern TypeScript Architecture');
    fireEvent.click(enrollmentsBtn);
    expect(onEnrollments).toHaveBeenCalledWith(mockCourses[0]);

    const deleteBtn = screen.getByLabelText('Delete Modern TypeScript Architecture');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(mockCourses[0]);
  });
});

describe('ReportsView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders completion metrics and student progress', () => {
    render(<ReportsView report={mockReport} />);

    expect(screen.getByText('Modern TypeScript Architecture')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument(); // total enrolled
    expect(screen.getByText('18')).toBeInTheDocument(); // completed count
    expect(screen.getByText('43%')).toBeInTheDocument(); // completion rate rounded
    expect(screen.getByText('65%')).toBeInTheDocument(); // avg progress rounded

    // Quiz performance metrics
    expect(screen.getByText('55')).toBeInTheDocument(); // total attempts
    expect(screen.getByText('83%')).toBeInTheDocument(); // avg score rounded
    expect(screen.getByText('78%')).toBeInTheDocument(); // pass rate rounded

    // Student progress rows
    expect(screen.getByText('Alex Mercer')).toBeInTheDocument();
    expect(screen.getByText('Dana Scully')).toBeInTheDocument();
  });

  it('exports CSV report when Export CSV button is clicked', async () => {
    const csvBlob = new Blob(['student,rollNo\nAlex,CS202601\n'], { type: 'text/csv' });
    const exportSpy = vi.spyOn(learningAdminApi, 'exportReportCsv').mockResolvedValue(csvBlob);

    // Mock createObjectURL & revokeObjectURL & link click
    const createUrlSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeUrlSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockReturnValue();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReportsView report={mockReport} />);

    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith('course-1');
      expect(createUrlSpy).toHaveBeenCalledWith(csvBlob);
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});

describe('AssignModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal when open and handles audience selection and assignment submission', async () => {
    const assignSpy = vi.spyOn(learningAdminApi, 'assignCourse').mockResolvedValue({ success: true, count: 25 });
    const onAssigned = vi.fn();
    const onClose = vi.fn();

    render(
      <AssignModal
        open={true}
        onClose={onClose}
        courseId="course-1"
        courseTitle="Modern TypeScript Architecture"
        onAssigned={onAssigned}
      />
    );

    expect(screen.getByRole('heading', { name: 'Assign Course' })).toBeInTheDocument();
    expect(screen.getByText('Modern TypeScript Architecture')).toBeInTheDocument();

    const targetSelect = screen.getByLabelText(/target audience/i);
    expect(targetSelect).toHaveValue('ALL');

    // Switch to Specific Students
    fireEvent.change(targetSelect, { target: { value: 'STUDENT' } });
    expect(screen.getByLabelText(/student ids/i)).toBeInTheDocument();

    const studentIdsInput = screen.getByLabelText(/student ids/i);
    fireEvent.change(studentIdsInput, { target: { value: 'stu_1, stu_2' } });

    const submitBtn = screen.getByRole('button', { name: /assign course/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('course-1', {
        targetType: 'STUDENT',
        studentIds: ['stu_1', 'stu_2'],
      });
      expect(onAssigned).toHaveBeenCalledWith(25);
    });

    // Test BATCH assignment
    fireEvent.change(targetSelect, { target: { value: 'BATCH' } });
    expect(screen.getByLabelText(/batch year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/section/i)).toBeInTheDocument();

    const yearSelect = screen.getByLabelText(/batch year/i);
    const sectionSelect = screen.getByLabelText(/section/i);
    fireEvent.change(yearSelect, { target: { value: '2026' } });
    fireEvent.change(sectionSelect, { target: { value: 'B' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('course-1', {
        targetType: 'BATCH',
        year: 2026,
        section: 'B',
      });
    });
  });
});
