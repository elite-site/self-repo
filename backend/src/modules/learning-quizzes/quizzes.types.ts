import { QuizQuestionType, QuizShowAnswers } from '@prisma/client';

export interface QuizQuestionSummary {
  id: string;
  order: number;
  type: QuizQuestionType;
  text: string;
  points: number;
  options: Array<{
    id: string;
    order: number;
    text: string;
  }>;
}

export interface QuizDetailResponse {
  id: string;
  courseId: string;
  lessonId: string;
  opensAt: string | null;
  dueAt: string | null;
  maxAttempts: number;
  timeLimitMin: number | null;
  passPercent: number;
  showAnswers: QuizShowAnswers;
  totalPoints: number;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  questions: QuizQuestionSummary[];
}

export interface QuizStartResponse {
  attemptId: string;
  startedAt: string;
  timeLimitMin: number | null;
  serverTime: string;
}

export interface QuizSubmitPayload {
  attemptId: string;
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
  }>;
}

export interface QuizAttemptResult {
  attemptId: string;
  score: number;
  maxScore: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  answersReview?: Array<{
    questionId: string;
    selectedOptionIds: string[];
    isCorrect?: boolean;
    correctOptionIds?: string[];
    explanation?: string | null;
  }>;
}

export interface QuizAdminInput {
  lessonId: string;
  opensAt?: string | Date | null;
  dueAt?: string | Date | null;
  maxAttempts?: number;
  timeLimitMin?: number | null;
  passPercent?: number;
  showAnswers?: QuizShowAnswers;
  questions: Array<{
    order: number;
    type: QuizQuestionType;
    text: string;
    explanation?: string | null;
    points?: number;
    options: Array<{
      order: number;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
}
