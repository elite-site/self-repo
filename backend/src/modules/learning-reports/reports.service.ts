import { reportsRepository, ReportsRepository } from './reports.repository';
import { NotFoundError } from '../../utils/appError';
import { LearningOverviewReport, CourseReportResponse } from './reports.types';

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export class ReportsService {
  constructor(private repo: ReportsRepository = reportsRepository) {}

  async getOverview(): Promise<LearningOverviewReport> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const aggregates = await this.repo.getOverviewAggregates(sevenDaysAgo);
    const overallCompletionRate = aggregates.totalEnrolments > 0
      ? Math.round((aggregates.completedEnrolments / aggregates.totalEnrolments) * 100)
      : 0;

    return {
      ...aggregates,
      overallCompletionRate,
    };
  }

  async getCourseReport(courseId: string): Promise<CourseReportResponse> {
    const course = await this.repo.findCourseBasic(courseId);
    if (!course) throw new NotFoundError('Course not found');

    const aggregates = await this.repo.getCourseReportAggregates(courseId);
    const completionRate = aggregates.totalEnrolled > 0
      ? Math.round((aggregates.completedCount / aggregates.totalEnrolled) * 100)
      : 0;

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      completionRate,
      ...aggregates,
    };
  }

  async streamCourseExport(courseId: string, output: { write: (chunk: string) => boolean | void; end: () => void }) {
    const course = await this.repo.findCourseBasic(courseId);
    if (!course) throw new NotFoundError('Course not found');

    output.write('Roll Number,Name,Email,Enrolled At,Status,Completed At\n');

    const BATCH_SIZE = 500;
    let skip = 0;

    while (true) {
      const batch = await this.repo.findEnrollmentsBatch(courseId, skip, BATCH_SIZE);
      if (batch.length === 0) break;

      for (const row of batch) {
        const rollNo = escapeCsv(row.student.rollNo);
        const name = escapeCsv(row.student.name);
        const email = escapeCsv(row.student.email || '');
        const enrolledAt = row.enrolledAt.toISOString();
        const status = row.status;
        const completedAt = row.completedAt ? row.completedAt.toISOString() : '';
        output.write(`${rollNo},${name},${email},${enrolledAt},${status},${completedAt}\n`);
      }

      if (batch.length < BATCH_SIZE) break;
      skip += BATCH_SIZE;
    }

    output.end();
  }
}

export const reportsService = new ReportsService();
