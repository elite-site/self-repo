import { Request, Response } from 'express';
import { coursesService } from './courses.service';
import {
  parseCourseInput,
  parseLessonInput,
  parseReorderLessonsInput,
  parseAssignInput,
  parseBulkLessonsInput,
} from './courses.schemas';

export async function getStudentCourses(req: Request, res: Response) {
  const result = await coursesService.listStudentCourses(req.student?.studentId || '', req.query);
  res.json(result);
}

export async function getStudentCourse(req: Request, res: Response) {
  const result = await coursesService.getStudentCourse(req.params.slugOrId, req.student?.studentId);
  res.json(result);
}

export async function enrollCourse(req: Request, res: Response) {
  const result = await coursesService.enrollStudent(req.params.id, req.student!.studentId);
  res.status(201).json(result);
}

export async function getAdminCourses(req: Request, res: Response) {
  const result = await coursesService.listAdminCourses(req.query);
  res.json(result);
}

export async function getAdminCourse(req: Request, res: Response) {
  const result = await coursesService.getAdminCourse(req.params.id);
  res.json(result);
}

export async function createCourse(req: Request, res: Response) {
  const data = parseCourseInput(req.body, false);
  const result = await coursesService.createCourse(data, req.adminUser);
  res.status(201).json(result);
}

export async function updateCourse(req: Request, res: Response) {
  const data = parseCourseInput(req.body, true);
  const result = await coursesService.updateCourse(req.params.id, data, req.adminUser);
  res.json(result);
}

export async function deleteCourse(req: Request, res: Response) {
  const result = await coursesService.deleteCourse(req.params.id, req.adminUser);
  res.json(result);
}

export async function createLesson(req: Request, res: Response) {
  const data = parseLessonInput(req.body, false);
  const result = await coursesService.createLesson(req.params.id, data);
  res.status(201).json(result);
}

export async function bulkCreateLessons(req: Request, res: Response) {
  const lessons = parseBulkLessonsInput(req.body);
  const result = await coursesService.bulkCreateLessons(req.params.id, lessons);
  res.status(201).json(result);
}

export async function updateLesson(req: Request, res: Response) {
  const data = parseLessonInput(req.body, true);
  const result = await coursesService.updateLesson(req.params.lessonId, data);
  res.json(result);
}

export async function deleteLesson(req: Request, res: Response) {
  const result = await coursesService.deleteLesson(req.params.lessonId);
  res.json(result);
}

export async function reorderLessons(req: Request, res: Response) {
  const lessonIds = parseReorderLessonsInput(req.body);
  const result = await coursesService.reorderLessons(lessonIds);
  res.json(result);
}

export async function assignCourse(req: Request, res: Response) {
  const payload = parseAssignInput(req.body);
  const result = await coursesService.assignCourse(req.params.id, payload, req.adminUser);
  res.json(result);
}

export async function getCourseEnrollments(req: Request, res: Response) {
  const result = await coursesService.getCourseEnrollments(req.params.id, req.query);
  res.json(result);
}

export async function getYouTubePreview(req: Request, res: Response) {
  const result = await coursesService.getYouTubePreview(req.query.url as string);
  res.json(result);
}

export async function getYouTubePlaylist(req: Request, res: Response) {
  const result = await coursesService.getYouTubePlaylist(req.query.url as string);
  res.json(result);
}
