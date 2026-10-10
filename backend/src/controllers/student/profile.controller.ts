import { Request, Response } from 'express';
import {
  getStudentProfile,
  updateStudentProfile,
} from '../../services/student/profile.service';
import {
  uploadProfilePhoto,
  deleteProfilePhoto,
} from '../../services/student/profilePhoto.service';
import {
  getActiveSkills,
  updateStudentSkills,
  createStudentChangeRequest,
  getStudentChangeRequests,
} from '../../services/student/profileSkills.service';
import {
  validateProfileUpdate,
  validatePhotoUpload,
  validateSkillsPayload,
  validateChangeRequestPayload,
} from '../../validators/student/profile.schema';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const studentId = req.student?.studentId || (req as any).studentId;
  const rollNo = req.student?.rollNo;

  const data = await getStudentProfile(studentId, rollNo);
  res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
  res.json(data);
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const studentId = req.student?.studentId || (req as any).studentId;
  const input = validateProfileUpdate(req.body);
  const profile = await updateStudentProfile(studentId, input);
  res.json(profile);
}

export async function uploadPhoto(req: Request, res: Response): Promise<void> {
  const studentId = req.student?.studentId || (req as any).studentId;
  const { file, photoOffsetX, photoOffsetY, photoZoom } = validatePhotoUpload(req.file, req.body);
  const result = await uploadProfilePhoto(studentId, file, { photoOffsetX, photoOffsetY, photoZoom });
  res.json(result);
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const result = await deleteProfilePhoto(studentId);
  res.json(result);
}

export async function getSkills(req: Request, res: Response): Promise<void> {
  const skills = await getActiveSkills();
  res.json(skills);
}

export async function updateSkills(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const { skillIds, skillNames } = validateSkillsPayload(req.body);
  const result = await updateStudentSkills(studentId, skillIds, skillNames);
  res.json(result);
}

export async function submitChangeRequest(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const input = validateChangeRequestPayload(req.body);
  const result = await createStudentChangeRequest(studentId, input);
  res.json(result);
}

export async function getChangeRequests(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const result = await getStudentChangeRequests(studentId);
  res.json(result);
}
