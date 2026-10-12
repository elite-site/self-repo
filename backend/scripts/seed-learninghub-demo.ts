import { prisma } from '../src/infrastructure/prisma';
import {
  CourseLevel,
  CourseStatus,
  EnrolmentType,
  LessonType,
  QuizQuestionType,
  QuizShowAnswers,
  CourseTargetType,
} from '@prisma/client';

export async function seedLearningHubDemo(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run seedLearningHubDemo in production');
  }

  console.log('Seeding LearningHub demo data...');

  // 1. Create Course 1: Full-Stack Web Development Bootcamp
  const course1 = await prisma.course.upsert({
    where: { slug: 'web-development-bootcamp' },
    create: {
      title: 'Full-Stack Web Development Bootcamp',
      slug: 'web-development-bootcamp',
      description: 'Master HTML, CSS, JavaScript, React, and Node.js from the ground up.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
      category: 'Development',
      level: CourseLevel.BEGINNER,
      estimatedHours: 12.5,
      status: CourseStatus.PUBLISHED,
      enrolment: EnrolmentType.OPEN,
      featured: true,
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: {
      title: 'Full-Stack Web Development Bootcamp',
      status: CourseStatus.PUBLISHED,
      featured: true,
    },
  });

  // Lessons for Course 1
  const lesson1 = await prisma.lesson.upsert({
    where: { id: 'demo-lesson-web-1' },
    create: {
      id: 'demo-lesson-web-1',
      courseId: course1.id,
      title: 'Introduction to Modern Web Architecture',
      order: 1,
      type: LessonType.YOUTUBE,
      youtubeVideoId: 'dQw4w9WgXcQ',
      durationSec: 600,
    },
    update: {},
  });

  await prisma.lesson.upsert({
    where: { id: 'demo-lesson-web-2' },
    create: {
      id: 'demo-lesson-web-2',
      courseId: course1.id,
      title: 'HTTP, REST APIs & Networking Primer',
      order: 2,
      type: LessonType.NOTES,
      notes: '# RESTful API Architecture\n\nUnderstand GET, POST, PUT, DELETE methods, status codes, and idempotency.',
      durationSec: 300,
    },
    update: {},
  });

  const lessonQuiz = await prisma.lesson.upsert({
    where: { id: 'demo-lesson-web-quiz' },
    create: {
      id: 'demo-lesson-web-quiz',
      courseId: course1.id,
      title: 'Web Fundamentals Checkpoint Quiz',
      order: 3,
      type: LessonType.QUIZ,
      durationSec: 900,
    },
    update: {},
  });

  // Quiz for Lesson 3
  const quiz1 = await prisma.quiz.upsert({
    where: { lessonId: lessonQuiz.id },
    create: {
      courseId: course1.id,
      lessonId: lessonQuiz.id,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours (tests reminder job)
      maxAttempts: 3,
      timeLimitMin: 15,
      passPercent: 70,
      showAnswers: QuizShowAnswers.AFTER_SUBMIT,
    },
    update: {},
  });

  // Questions for Quiz 1
  const q1 = await prisma.quizQuestion.upsert({
    where: { id: 'demo-quiz1-q1' },
    create: {
      id: 'demo-quiz1-q1',
      quizId: quiz1.id,
      order: 1,
      type: QuizQuestionType.SINGLE,
      text: 'Which HTTP status code signifies that a resource was successfully created?',
      points: 2,
      explanation: 'HTTP 201 Created is the standard status code returned when a resource is created.',
      options: {
        create: [
          { order: 1, text: '200 OK', isCorrect: false },
          { order: 2, text: '201 Created', isCorrect: true },
          { order: 3, text: '204 No Content', isCorrect: false },
          { order: 4, text: '400 Bad Request', isCorrect: false },
        ],
      },
    },
    update: {},
  });

  // Course 2: Advanced Cloud & Distributed Systems
  await prisma.course.upsert({
    where: { slug: 'cloud-distributed-systems' },
    create: {
      title: 'Advanced Cloud & Distributed Systems',
      slug: 'cloud-distributed-systems',
      description: 'Design resilient microservices, distributed cache architectures, and Kubernetes clusters.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
      category: 'Cloud',
      level: CourseLevel.ADVANCED,
      estimatedHours: 20.0,
      status: CourseStatus.PUBLISHED,
      enrolment: EnrolmentType.OPEN,
      featured: false,
    },
    update: {},
  });

  // Course 3: Machine Learning with Python
  await prisma.course.upsert({
    where: { slug: 'machine-learning-python' },
    create: {
      title: 'Applied Machine Learning in Python',
      slug: 'machine-learning-python',
      description: 'Supervised and unsupervised learning with NumPy, Pandas, and Scikit-Learn.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800',
      category: 'AI & Data',
      level: CourseLevel.INTERMEDIATE,
      estimatedHours: 15.0,
      status: CourseStatus.PUBLISHED,
      enrolment: EnrolmentType.OPEN,
      featured: true,
    },
    update: {},
  });

  // Target all students for Course 1
  await prisma.courseTarget.create({
    data: {
      courseId: course1.id,
      targetType: CourseTargetType.ALL,
    },
  }).catch(() => {});

  console.log('LearningHub demo seed completed successfully.');
}

if (require.main === module) {
  seedLearningHubDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed script failed:', err);
      process.exit(1);
    });
}
