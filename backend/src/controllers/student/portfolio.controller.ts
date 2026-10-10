import { Request, Response } from 'express';
import { getUnifiedPortfolio, togglePortfolioItemVisibility } from '../../services/student/portfolio.service';
import {
  listProjects,
  createProject,
  reorderProjects,
  updateProject,
  deleteProject,
} from '../../services/student/project.service';
import {
  listAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
} from '../../services/student/achievement.service';
import {
  listCertificates,
  createCertificate,
  updateCertificateVisibility,
  deleteCertificate,
} from '../../services/student/certificate.service';
import {
  validateCreateProjectInput,
  validateReorderProjectsInput,
  validateUpdateProjectInput,
  validateCreateAchievementInput,
  validateUpdateAchievementInput,
  validateCreateCertificateInput,
  validateVisibilityPayload,
  validatePortfolioKind,
} from '../../validators/student/portfolio.schema';

const getStudentId = (req: Request): string => (req as any).studentId || req.student?.studentId;

export async function getPortfolio(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'private, max-age=30, must-revalidate');
  const result = await getUnifiedPortfolio(getStudentId(req));
  res.json(result);
}

export async function getProjects(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'private, max-age=30, must-revalidate');
  const result = await listProjects(getStudentId(req));
  res.json(result);
}

export async function postProject(req: Request, res: Response): Promise<void> {
  const data = validateCreateProjectInput(req.body);
  const result = await createProject(getStudentId(req), data);
  res.status(201).json(result);
}

export async function putProjectsReorder(req: Request, res: Response): Promise<void> {
  const ids = validateReorderProjectsInput(req.body);
  const result = await reorderProjects(getStudentId(req), ids);
  res.json(result);
}

export async function putProject(req: Request, res: Response): Promise<void> {
  const updateData = validateUpdateProjectInput(req.body);
  const result = await updateProject(getStudentId(req), req.params.id, updateData);
  res.json(result);
}

export async function deleteProjectById(req: Request, res: Response): Promise<void> {
  const result = await deleteProject(getStudentId(req), req.params.id);
  res.json(result);
}

export async function getAchievements(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'private, max-age=30, must-revalidate');
  const result = await listAchievements(getStudentId(req));
  res.json(result);
}

export async function postAchievement(req: Request, res: Response): Promise<void> {
  const data = validateCreateAchievementInput(req.body);
  const file = (req as any).file || req.file;
  const result = await createAchievement(getStudentId(req), data, file);
  res.status(201).json(result);
}

export async function putAchievement(req: Request, res: Response): Promise<void> {
  const updateData = validateUpdateAchievementInput(req.body);
  const result = await updateAchievement(getStudentId(req), req.params.id, updateData);
  res.json(result);
}

export async function deleteAchievementById(req: Request, res: Response): Promise<void> {
  const result = await deleteAchievement(getStudentId(req), req.params.id);
  res.json(result);
}

export async function getCertificates(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'private, max-age=30, must-revalidate');
  const result = await listCertificates(getStudentId(req));
  res.json(result);
}

export async function postCertificate(req: Request, res: Response): Promise<void> {
  const data = validateCreateCertificateInput(req.body);
  const result = await createCertificate(getStudentId(req), data, req.file);
  res.status(201).json(result);
}

export async function patchCertificateVisibility(req: Request, res: Response): Promise<void> {
  const isPublic = validateVisibilityPayload(req.body);
  const result = await updateCertificateVisibility(getStudentId(req), req.params.id, isPublic);
  res.json(result);
}

export async function deleteCertificateById(req: Request, res: Response): Promise<void> {
  const result = await deleteCertificate(getStudentId(req), req.params.id);
  res.json(result);
}

export async function patchItemVisibility(req: Request, res: Response): Promise<void> {
  const kind = validatePortfolioKind(req.params.kind);
  const isPublic = validateVisibilityPayload(req.body);
  const result = await togglePortfolioItemVisibility(getStudentId(req), kind, req.params.id, isPublic);
  res.json(result);
}
