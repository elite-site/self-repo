import {
  AnnouncementStatus,
  ContentStatus,
  CourseStatus,
  EventStatus,
  Prisma,
  StudentStatus,
} from '@prisma/client';
import { EXCLUDE_INTERNAL_EVENT } from '../../config/constants';
import { prisma } from '../../infrastructure/prisma';
import { buildResultUrl, type SearchItem, type SearchResultType } from './search.types';

export interface StudentSearchContext {
  id: string;
  year: number;
  semester: number | null;
  section: string;
}

export interface CatalogIndexEntry {
  item: SearchItem;
  titleLower: string;
  searchText: string;
  /** Resource semester for semester-based access checks (SEC-1). */
  semester?: number;
  /** Announcement audience targeting metadata (SEC-1). */
  targetAll?: boolean;
  targetYear?: number | null;
  targetSection?: string | null;
}

export interface SharedCatalogIndex {
  courses: CatalogIndexEntry[];
  lessons: CatalogIndexEntry[];
  events: CatalogIndexEntry[];
  resources: CatalogIndexEntry[];
  announcements: CatalogIndexEntry[];
  students: CatalogIndexEntry[];
}

const INSENSITIVE = Prisma.QueryMode.insensitive;

function normalizeSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .toLowerCase();
}

function formatCatalogEntry(
  item: SearchItem,
  extraSearchParts: Array<string | null | undefined> = [],
  meta: Pick<CatalogIndexEntry, 'semester' | 'targetAll' | 'targetYear' | 'targetSection'> = {},
): CatalogIndexEntry {
  return {
    item,
    titleLower: item.title.toLowerCase(),
    searchText: normalizeSearchText([item.title, item.description, ...extraSearchParts]),
    ...meta,
  };
}

/**
 * Loads and queries all searchable portal content.
 *
 * Shared catalog tables (courses, lessons, events, resources, announcements,
 * directory students) are loaded into a compact pre-normalized index for
 * `SearchService`'s in-memory `TtlCache`. Student-owned and moderated items
 * (projects, resumes, achievements, certificates, GitHub repos) query indexed
 * columns directly with strict projections (never binary thumbnails or Drive IDs).
 */
export class SearchRepository {
  async getStudentContext(studentId: string): Promise<StudentSearchContext | null> {
    return prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, year: true, semester: true, section: true },
    });
  }

  async loadSharedCatalogIndex(includeLearning: boolean): Promise<SharedCatalogIndex> {
    const [courses, lessons, events, resources, announcements, students] = await Promise.all([
      includeLearning
        ? prisma.course.findMany({
            where: { status: CourseStatus.PUBLISHED },
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              category: true,
              instructor: true,
              skills: true,
              updatedAt: true,
            },
            orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
            take: 500,
          })
        : Promise.resolve([]),
      includeLearning
        ? prisma.lesson.findMany({
            where: { course: { status: CourseStatus.PUBLISHED } },
            select: {
              id: true,
              title: true,
              course: { select: { title: true, updatedAt: true } },
            },
            orderBy: { order: 'asc' },
            take: 2000,
          })
        : Promise.resolve([]),
      prisma.event.findMany({
        where: {
          status: EventStatus.OPEN,
          ...EXCLUDE_INTERNAL_EVENT,
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
      prisma.resource.findMany({
        select: {
          id: true,
          title: true,
          subject: true,
          semester: true,
          type: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      }),
      prisma.announcement.findMany({
        where: { status: AnnouncementStatus.PUBLISHED },
        select: {
          id: true,
          title: true,
          message: true,
          targetAll: true,
          targetYear: true,
          targetSection: true,
          publishedAt: true,
          updatedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 200,
      }),
      prisma.student.findMany({
        where: { status: { in: [StudentStatus.ACTIVE, StudentStatus.GRADUATED] } },
        select: {
          id: true,
          rollNo: true,
          name: true,
          year: true,
          section: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        take: 2000,
      }),
    ]);

    return {
      courses: courses.map((course) =>
        formatCatalogEntry(
          {
            type: 'course',
            id: course.id,
            title: course.title,
            description: course.category || course.description,
            url: buildResultUrl('course', course.id, { slug: course.slug }),
            studentId: null,
            updatedAt: course.updatedAt,
          },
          [course.description, course.instructor, ...course.skills],
        ),
      ),
      lessons: lessons.map((lesson) =>
        formatCatalogEntry({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          description: lesson.course.title,
          url: buildResultUrl('lesson', lesson.id),
          studentId: null,
          updatedAt: lesson.course.updatedAt,
        }),
      ),
      events: events.map((event) =>
        formatCatalogEntry(
          {
            type: 'event',
            id: event.id,
            title: event.name,
            description: event.description,
            url: buildResultUrl('event', event.id),
            studentId: null,
            updatedAt: event.updatedAt,
          },
          [event.type],
        ),
      ),
      resources: resources.map((resource) =>
        formatCatalogEntry(
          {
            type: 'resource',
            id: resource.id,
            title: resource.title,
            description: `${resource.subject} · Sem ${resource.semester}`,
            url: buildResultUrl('resource', resource.id),
            studentId: null,
            updatedAt: resource.updatedAt,
          },
          [resource.subject, resource.type],
          { semester: resource.semester },
        ),
      ),
      announcements: announcements.map((ann) =>
        formatCatalogEntry(
          {
            type: 'announcement',
            id: ann.id,
            title: ann.title,
            description: ann.message.slice(0, 120),
            url: buildResultUrl('announcement', ann.id),
            studentId: null,
            updatedAt: ann.publishedAt ?? ann.updatedAt,
          },
          [ann.message],
          {
            targetAll: ann.targetAll,
            targetYear: ann.targetYear,
            targetSection: ann.targetSection,
          },
        ),
      ),
      students: students.map((student) =>
        formatCatalogEntry(
          {
            type: 'student',
            id: student.id,
            title: student.name,
            description: `${student.rollNo} · Year ${student.year} ${student.section}`,
            url: buildResultUrl('student', student.id, { rollNo: student.rollNo }),
            studentId: student.id,
            updatedAt: student.createdAt,
          },
          [student.rollNo],
        ),
      ),
    };
  }

  async findProjects(studentId: string, q: string, limit: number): Promise<SearchItem[]> {
    const rows = await prisma.project.findMany({
      where: {
        AND: [
          { OR: [{ studentId }, { isPublic: true, status: ContentStatus.APPROVED }] },
          {
            OR: [
              { title: { contains: q, mode: INSENSITIVE } },
              { description: { contains: q, mode: INSENSITIVE } },
              { technologies: { has: q } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        studentId: true,
        updatedAt: true,
        student: { select: { rollNo: true, name: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => {
      const isOwn = row.studentId === studentId;
      return {
        type: 'project',
        id: row.id,
        title: row.title,
        description: isOwn ? row.description : `${row.student.name}${row.description ? ` · ${row.description}` : ''}`,
        url: buildResultUrl('project', row.id, { isOwn, rollNo: row.student.rollNo }),
        studentId: row.studentId,
        updatedAt: row.updatedAt,
      };
    });
  }

  async findResumes(studentId: string, q: string, limit: number): Promise<SearchItem[]> {
    const rows = await prisma.resume.findMany({
      where: {
        AND: [
          {
            OR: [
              { studentId },
              { isPublic: true, status: ContentStatus.APPROVED, isActive: true },
            ],
          },
          {
            OR: [
              { filename: { contains: q, mode: INSENSITIVE } },
              { student: { name: { contains: q, mode: INSENSITIVE } } },
              { student: { rollNo: { contains: q, mode: INSENSITIVE } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        filename: true,
        studentId: true,
        updatedAt: true,
        student: { select: { rollNo: true, name: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => {
      const isOwn = row.studentId === studentId;
      return {
        type: 'resume',
        id: row.id,
        title: row.filename || `${row.student.name} Resume`,
        description: isOwn ? 'My Resume' : `${row.student.name} (${row.student.rollNo})`,
        url: buildResultUrl('resume', row.id, { isOwn, rollNo: row.student.rollNo }),
        studentId: row.studentId,
        updatedAt: row.updatedAt,
      };
    });
  }

  async findAchievements(studentId: string, q: string, limit: number): Promise<SearchItem[]> {
    const rows = await prisma.achievement.findMany({
      where: {
        AND: [
          { OR: [{ studentId }, { isPublic: true, status: ContentStatus.APPROVED }] },
          {
            OR: [
              { title: { contains: q, mode: INSENSITIVE } },
              { description: { contains: q, mode: INSENSITIVE } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        studentId: true,
        updatedAt: true,
        student: { select: { rollNo: true, name: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => {
      const isOwn = row.studentId === studentId;
      return {
        type: 'achievement',
        id: row.id,
        title: row.title,
        description: isOwn ? row.description : `${row.student.name}${row.description ? ` · ${row.description}` : ''}`,
        url: buildResultUrl('achievement', row.id, { isOwn, rollNo: row.student.rollNo }),
        studentId: row.studentId,
        updatedAt: row.updatedAt,
      };
    });
  }

  async findCertificates(studentId: string, q: string, limit: number): Promise<SearchItem[]> {
    const rows = await prisma.certificate.findMany({
      where: {
        AND: [
          { OR: [{ studentId }, { isPublic: true, status: ContentStatus.APPROVED }] },
          {
            OR: [
              { title: { contains: q, mode: INSENSITIVE } },
              { issuer: { contains: q, mode: INSENSITIVE } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        issuer: true,
        studentId: true,
        updatedAt: true,
        student: { select: { rollNo: true, name: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => {
      const isOwn = row.studentId === studentId;
      return {
        type: 'certificate',
        id: row.id,
        title: row.title,
        description: isOwn ? row.issuer : `${row.student.name}${row.issuer ? ` · ${row.issuer}` : ''}`,
        url: buildResultUrl('certificate', row.id, { isOwn, rollNo: row.student.rollNo }),
        studentId: row.studentId,
        updatedAt: row.updatedAt,
      };
    });
  }

  async findGithubRepos(studentId: string, q: string, limit: number): Promise<SearchItem[]> {
    const rows = await prisma.githubRepo.findMany({
      where: {
        studentId,
        removedFromGithub: false,
        OR: [
          { name: { contains: q, mode: INSENSITIVE } },
          { description: { contains: q, mode: INSENSITIVE } },
          { primaryLanguage: { contains: q, mode: INSENSITIVE } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        primaryLanguage: true,
        studentId: true,
        syncedAt: true,
      },
      take: limit,
      orderBy: [{ isShowcased: 'desc' }, { stars: 'desc' }, { syncedAt: 'desc' }],
    });

    return rows.map((row) => ({
      type: 'github',
      id: row.id,
      title: row.name,
      description: [row.primaryLanguage, row.description].filter(Boolean).join(' · ') || null,
      url: buildResultUrl('github', row.id),
      studentId: row.studentId,
      updatedAt: row.syncedAt,
    }));
  }

  async findPersonalByType(
    type: Extract<SearchResultType, 'project' | 'resume' | 'achievement' | 'certificate' | 'github'>,
    studentId: string,
    q: string,
    limit: number,
  ): Promise<SearchItem[]> {
    switch (type) {
      case 'project':
        return this.findProjects(studentId, q, limit);
      case 'resume':
        return this.findResumes(studentId, q, limit);
      case 'achievement':
        return this.findAchievements(studentId, q, limit);
      case 'certificate':
        return this.findCertificates(studentId, q, limit);
      case 'github':
        return this.findGithubRepos(studentId, q, limit);
    }
  }
}

export const searchRepository = new SearchRepository();
