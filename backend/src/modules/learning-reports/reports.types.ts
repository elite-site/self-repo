export interface LearningOverviewReport {
  totalCourses: number;
  publishedCourses: number;
  totalEnrolments: number;
  completedEnrolments: number;
  overallCompletionRate: number;
  activeLearnersLast7Days: number;
}

export interface CourseReportResponse {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  totalEnrolled: number;
  completedCount: number;
  completionRate: number;
  quizAverageScore: number | null;
  quizTotalAttempts: number;
  lessonCompletions: Array<{
    lessonId: string;
    completedCount: number;
  }>;
  recentLearners: Array<{
    studentId: string;
    studentName: string;
    rollNo: string;
    enrolledAt: string;
    status: string;
    completedAt: string | null;
  }>;
}
