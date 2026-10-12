import { ValidationError } from '../../utils/appError';
import { CourseLevel, CourseStatus, EnrolmentType, LessonType, CourseTargetType } from '@prisma/client';
import { BulkLessonItem } from './courses.types';

export function parseCourseInput(body: any, isUpdate = false) {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be an object');
  const {
    title,
    description,
    slug,
    thumbnailUrl,
    category,
    level,
    estimatedHours,
    status,
    enrolment,
    featured,
    dueAt,
    instructor,
    prerequisites,
    outcomes,
    skills,
    target,
    lessons,
  } = body;

  if (!isUpdate && (!title || typeof title !== 'string' || !title.trim())) {
    throw new ValidationError('Title is required', [{ field: 'title', message: 'Title is required' }]);
  }
  if (!isUpdate && (description === undefined || typeof description !== 'string')) {
    throw new ValidationError('Description is required', [{ field: 'description', message: 'Description is required' }]);
  }

  const generatedSlug = slug
    ? String(slug).trim()
    : title
    ? String(title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : undefined;

  let parsedSkills: string[] | undefined = undefined;
  if (skills !== undefined) {
    if (Array.isArray(skills)) {
      parsedSkills = skills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof skills === 'string') {
      parsedSkills = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      parsedSkills = [];
    }
  }

  let parsedTarget: { targetType: CourseTargetType; year?: number; section?: string; studentIds?: string[] } | undefined = undefined;
  if (target && typeof target === 'object') {
    if (['ALL', 'STUDENT', 'BATCH'].includes(target.targetType)) {
      parsedTarget = {
        targetType: target.targetType as CourseTargetType,
        year: target.year ? Number(target.year) : undefined,
        section: target.section ? String(target.section).trim() : undefined,
        studentIds: Array.isArray(target.studentIds) ? target.studentIds.map(String) : [],
      };
    }
  }

  let parsedLessons: BulkLessonItem[] | undefined = undefined;
  if (Array.isArray(lessons)) {
    parsedLessons = lessons.map((l: any, idx: number) => ({
      title: String(l.title || `Lesson ${idx + 1}`).trim(),
      type: (l.type as LessonType) || LessonType.YOUTUBE,
      youtubeVideoId: l.youtubeVideoId ? String(l.youtubeVideoId).trim() : null,
      url: l.url ? String(l.url).trim() : null,
      notes: l.notes ? String(l.notes).trim() : null,
      durationSec: l.durationSec !== undefined && l.durationSec !== null ? Number(l.durationSec) : null,
      order: l.order !== undefined ? Number(l.order) : idx + 1,
    }));
  }

  return {
    ...(title !== undefined && { title: String(title).trim() }),
    ...(generatedSlug !== undefined && { slug: generatedSlug }),
    ...(description !== undefined && { description: String(description).trim() }),
    ...(thumbnailUrl !== undefined && { thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : null }),
    ...(category !== undefined && { category: category ? String(category).trim() : null }),
    ...(level !== undefined && { level: level ? (level as CourseLevel) : null }),
    ...(estimatedHours !== undefined && { estimatedHours: estimatedHours !== null ? Number(estimatedHours) : null }),
    ...(status !== undefined && { status: status as CourseStatus }),
    ...(enrolment !== undefined && { enrolment: enrolment as EnrolmentType }),
    ...(featured !== undefined && { featured: Boolean(featured) }),
    ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
    ...(instructor !== undefined && { instructor: instructor ? String(instructor).trim() : null }),
    ...(prerequisites !== undefined && { prerequisites: prerequisites ? String(prerequisites).trim() : null }),
    ...(outcomes !== undefined && { outcomes: outcomes ? String(outcomes).trim() : null }),
    ...(parsedSkills !== undefined && { skills: parsedSkills }),
    ...(parsedTarget !== undefined && { target: parsedTarget }),
    ...(parsedLessons !== undefined && { lessons: parsedLessons }),
  };
}

export function parseLessonInput(body: any, isUpdate = false) {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be an object');
  const { title, type, order, youtubeVideoId, url, notes, durationSec } = body;

  if (!isUpdate && (!title || typeof title !== 'string' || !title.trim())) {
    throw new ValidationError('Lesson title is required', [{ field: 'title', message: 'Title is required' }]);
  }

  return {
    ...(title !== undefined && { title: String(title).trim() }),
    ...(type !== undefined && { type: type as LessonType }),
    ...(order !== undefined && { order: Number(order) }),
    ...(youtubeVideoId !== undefined && { youtubeVideoId: youtubeVideoId ? String(youtubeVideoId).trim() : null }),
    ...(url !== undefined && { url: url ? String(url).trim() : null }),
    ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
    ...(durationSec !== undefined && { durationSec: durationSec !== null ? Number(durationSec) : null }),
  };
}

export function parseBulkLessonsInput(body: any): BulkLessonItem[] {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be an object');
  if (!Array.isArray(body.lessons) || body.lessons.length === 0) {
    throw new ValidationError('lessons array is required and must not be empty');
  }

  return body.lessons.map((l: any, idx: number) => {
    if (!l.title || typeof l.title !== 'string' || !l.title.trim()) {
      throw new ValidationError(`Lesson at index ${idx} is missing a title`);
    }
    return {
      title: String(l.title).trim(),
      type: (l.type as LessonType) || LessonType.YOUTUBE,
      youtubeVideoId: l.youtubeVideoId ? String(l.youtubeVideoId).trim() : null,
      url: l.url ? String(l.url).trim() : null,
      notes: l.notes ? String(l.notes).trim() : null,
      durationSec: l.durationSec !== undefined && l.durationSec !== null ? Number(l.durationSec) : null,
      order: l.order !== undefined ? Number(l.order) : idx + 1,
    };
  });
}

export function parseReorderLessonsInput(body: any) {
  if (!body || !Array.isArray(body.lessonIds)) {
    throw new ValidationError('lessonIds must be an array of string IDs', [{ field: 'lessonIds', message: 'Array required' }]);
  }
  return body.lessonIds.map(String);
}

export function parseAssignInput(body: any) {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be an object');
  const { targetType, studentIds, year, section } = body;
  if (!targetType || !['ALL', 'STUDENT', 'BATCH'].includes(targetType)) {
    throw new ValidationError('Valid targetType (ALL, STUDENT, BATCH) is required');
  }
  return {
    targetType: targetType as CourseTargetType,
    studentIds: Array.isArray(studentIds) ? studentIds.map(String) : [],
    year: year !== undefined && year !== null ? Number(year) : undefined,
    section: section ? String(section).trim() : undefined,
  };
}
