import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './courses.controller';

export const studentCoursesRouter = Router();
studentCoursesRouter.use(requireStudentAuth);
studentCoursesRouter.get(['/courses', '/'], asyncHandler(controller.getStudentCourses));
studentCoursesRouter.get(['/courses/:slugOrId', '/:slugOrId'], asyncHandler(controller.getStudentCourse));
studentCoursesRouter.post(['/courses/:id/enroll', '/:id/enroll'], asyncHandler(controller.enrollCourse));

export const adminCoursesRouter = Router();
adminCoursesRouter.use(requireAdminAuth);
adminCoursesRouter.get(['/admin/youtube/preview', '/youtube/preview'], asyncHandler(controller.getYouTubePreview));
adminCoursesRouter.get(['/admin/courses', '/courses', '/'], asyncHandler(controller.getAdminCourses));
adminCoursesRouter.post(['/admin/courses', '/courses', '/'], asyncHandler(controller.createCourse));
adminCoursesRouter.get(['/admin/courses/:id', '/courses/:id', '/:id'], asyncHandler(controller.getAdminCourse));
adminCoursesRouter.put(['/admin/courses/:id', '/courses/:id', '/:id'], asyncHandler(controller.updateCourse));
adminCoursesRouter.delete(['/admin/courses/:id', '/courses/:id', '/:id'], asyncHandler(controller.deleteCourse));
adminCoursesRouter.post(['/admin/courses/:id/lessons', '/courses/:id/lessons', '/:id/lessons'], asyncHandler(controller.createLesson));
adminCoursesRouter.put(['/admin/courses/:id/lessons/reorder', '/courses/:id/lessons/reorder', '/:id/lessons/reorder'], asyncHandler(controller.reorderLessons));
adminCoursesRouter.put(['/admin/courses/:id/lessons/:lessonId', '/courses/:id/lessons/:lessonId', '/:id/lessons/:lessonId'], asyncHandler(controller.updateLesson));
adminCoursesRouter.delete(['/admin/courses/:id/lessons/:lessonId', '/courses/:id/lessons/:lessonId', '/:id/lessons/:lessonId'], asyncHandler(controller.deleteLesson));
adminCoursesRouter.post(['/admin/courses/:id/assign', '/courses/:id/assign', '/:id/assign'], asyncHandler(controller.assignCourse));
adminCoursesRouter.get(['/admin/courses/:id/enrollments', '/courses/:id/enrollments', '/:id/enrollments'], asyncHandler(controller.getCourseEnrollments));

export const coursesRouter = Router();
coursesRouter.use(studentCoursesRouter);
coursesRouter.use(adminCoursesRouter);

export default coursesRouter;
