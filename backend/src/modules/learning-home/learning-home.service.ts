import { TtlCache } from '../../utils/ttlCache';
import { learningHomeRepository, LearningHomeRepository } from './learning-home.repository';
import { coursesService, CoursesService } from '../learning-courses';
import { progressService, ProgressService } from '../learning-progress';
import { CourseCardSummary, HomeFeedResponse } from './learning-home.types';

interface CachedPublicRows {
  topCourses: any[];
  newCourses: any[];
  categories: Array<{ category: string; courses: any[] }>;
}

const FIVE_MIN_MS = 5 * 60 * 1000;
const publicRowsCache = new TtlCache<CachedPublicRows>(FIVE_MIN_MS, 10);

export class LearningHomeService {
  constructor(
    private readonly repo: LearningHomeRepository = learningHomeRepository,
    public readonly coursesSvc: CoursesService = coursesService,
    public readonly progressSvc: ProgressService = progressService,
  ) {}

  async getCourseDetails(slugOrId: string, studentId?: string) {
    return this.coursesSvc.getStudentCourse(slugOrId, studentId);
  }

  async getStudentLearningOverview(studentId: string) {
    return this.progressSvc.getMyLearning(studentId);
  }

  private mapCard(c: any, enMap?: Map<string, any>, progMap?: Map<string, number>): CourseCardSummary {
    const totalDurationSec = c.lessons?.reduce((acc: number, l: any) => acc + (l.durationSec || 0), 0) || 0;
    const en = enMap?.get(c.id);
    const progressPercent = progMap?.get(c.id);

    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl ?? null,
      category: c.category ?? null,
      level: c.level ?? null,
      estimatedHours: c.estimatedHours ?? null,
      status: c.status,
      enrolment: c.enrolment,
      featured: Boolean(c.featured),
      dueAt: c.dueAt ? new Date(c.dueAt).toISOString() : null,
      lessonCount: c._count?.lessons ?? (c.lessons?.length || 0),
      totalDurationSec,
      isEnrolled: Boolean(en),
      ...(en && {
        progressPercent: progressPercent ?? (en.status === 'COMPLETED' ? 100 : 0),
        enrollmentStatus: en.status,
        isAssigned: en.source === 'ASSIGNED',
      }),
    };
  }

  async getHomeFeed(studentId: string): Promise<HomeFeedResponse> {
    const cachedPublic = await publicRowsCache.wrap('home_public_rows', async () => {
      const [topCourses, newCourses, categories] = await Promise.all([
        this.repo.getTopCourses(12),
        this.repo.getNewCourses(12),
        this.repo.getCategoriesWithCourses(12),
      ]);
      return { topCourses, newCourses, categories };
    });

    const [enrollments, history] = await Promise.all([
      this.repo.getStudentEnrollments(studentId),
      this.repo.getStudentHistory(studentId, 12),
    ]);

    const enMap = new Map<string, any>();
    const courseIds = enrollments.map((e) => {
      enMap.set(e.courseId, e);
      return e.courseId;
    });

    const progressSummary = await this.repo.getStudentProgressSummary(studentId, courseIds);
    const completedCounts = new Map<string, number>();
    for (const p of progressSummary) {
      if (p.completed) {
        completedCounts.set(p.courseId, (completedCounts.get(p.courseId) || 0) + 1);
      }
    }

    const progMap = new Map<string, number>();
    for (const en of enrollments) {
      const total = en.course._count?.lessons || 0;
      const comp = completedCounts.get(en.courseId) || 0;
      progMap.set(en.courseId, total > 0 ? Math.round((comp / total) * 100) : (en.status === 'COMPLETED' ? 100 : 0));
    }

    const continueLearning = enrollments
      .filter((e) => e.status === 'ACTIVE')
      .slice(0, 12)
      .map((e) => this.mapCard(e.course, enMap, progMap));

    const assignedToYou = enrollments
      .filter((e) => e.source === 'ASSIGNED')
      .slice(0, 12)
      .map((e) => this.mapCard(e.course, enMap, progMap));

    let hero: CourseCardSummary | null = null;
    if (continueLearning.length > 0) {
      hero = continueLearning[0];
    } else {
      const featured = await this.repo.getFeaturedCourse();
      if (featured) hero = this.mapCard(featured, enMap, progMap);
      else if (cachedPublic.newCourses.length > 0) hero = this.mapCard(cachedPublic.newCourses[0], enMap, progMap);
    }

    return {
      hero,
      rows: {
        continueLearning,
        assignedToYou,
        topCourses: cachedPublic.topCourses.map((c) => this.mapCard(c, enMap, progMap)),
        newCourses: cachedPublic.newCourses.map((c) => this.mapCard(c, enMap, progMap)),
        categories: cachedPublic.categories.map((cat) => ({
          category: cat.category,
          courses: cat.courses.map((c) => this.mapCard(c, enMap, progMap)),
        })),
        history,
      },
    };
  }
}

export const learningHomeService = new LearningHomeService();
