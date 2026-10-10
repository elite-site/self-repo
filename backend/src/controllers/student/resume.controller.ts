import { Request, Response } from 'express';
import {
  listStudentResumes,
  uploadStudentResume,
  withdrawStudentResume,
} from '../../services/student/resume.service';
import { validateResumeFile } from '../../validators/student/resume.schema';

export async function getResumes(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const resumes = await listStudentResumes(studentId);

  res.set('Cache-Control', 'private, max-age=30, must-revalidate');
  res.json(resumes);
}

export async function postResume(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const rawFile = req.file || (req.files as any)?.resume?.[0] || (req.files as any)?.file?.[0];
  const resumeFile = validateResumeFile(rawFile);

  const result = await uploadStudentResume(studentId, resumeFile);
  res.status(201).json(result);
}

export async function deleteResume(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  await withdrawStudentResume(studentId);
  res.json({ success: true, message: 'Your resume has been deleted.' });
}
