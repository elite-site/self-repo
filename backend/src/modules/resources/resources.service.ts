import { NotFoundError, ForbiddenError } from '../../utils/appError';
import {
  getAllowedSemesters,
  getCurrentSemester,
  formatDriveLinks,
  RESOURCE_SEMESTER_ACCESS_RULE,
} from './resources.constants';
import * as repo from './resources.repository';
import type {
  ResourceDTO,
  StudentResourcesResponse,
  CreateResourcePayload,
  UpdateResourcePayload,
  ResourceType,
} from './resources.types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function mapResourceToDTO(r: any): ResourceDTO {
  const links = formatDriveLinks(r.driveLink);
  const createdDate = new Date(r.createdAt);
  const isNew = Date.now() - createdDate.getTime() < SEVEN_DAYS_MS;

  return {
    id: r.id,
    title: r.title,
    year: r.year,
    semester: r.semester,
    subject: r.subject,
    type: r.type,
    driveLink: r.driveLink,
    drive_link: r.driveLink,
    previewUrl: links.previewUrl,
    downloadUrl: links.downloadUrl,
    uploadedBy: r.uploadedBy,
    uploaded_by: r.uploadedBy,
    createdAt: createdDate.toISOString(),
    created_at: createdDate.toISOString(),
    isNew,
  };
}

export async function getStudentAllowedSemesters(studentId: string) {
  const student = await repo.findStudentYearAndSemester(studentId);
  if (!student) {
    throw new NotFoundError('Student account not found');
  }

  const allowedSemesters = getAllowedSemesters(student);
  const currentSemester = getCurrentSemester(student);

  return {
    allowedSemesters,
    currentSemester,
    year: student.year,
    accessRule: RESOURCE_SEMESTER_ACCESS_RULE,
  };
}

export async function getStudentResources(
  studentId: string,
  filter: {
    semester?: number;
    type?: ResourceType;
    search?: string;
  }
): Promise<StudentResourcesResponse> {
  const student = await repo.findStudentYearAndSemester(studentId);
  if (!student) {
    throw new NotFoundError('Student account not found');
  }

  const allowedSemesters = getAllowedSemesters(student);
  const currentSemester = getCurrentSemester(student);

  // If student requested a specific semester, check permissions strictly on backend
  if (filter.semester !== undefined) {
    if (!allowedSemesters.includes(filter.semester)) {
      throw new ForbiddenError(
        `Access denied. You are only permitted to access semesters ${allowedSemesters.join(', ')}.`
      );
    }
  }

  const targetSemesters = filter.semester !== undefined ? [filter.semester] : allowedSemesters;

  const rows = await repo.findResourcesBySemesters({
    semesters: targetSemesters,
    type: filter.type,
    search: filter.search,
  });

  const resources = rows.map(mapResourceToDTO);

  return {
    resources,
    allowedSemesters,
    currentSemester,
    accessRule: RESOURCE_SEMESTER_ACCESS_RULE,
    totalCount: resources.length,
  };
}

export async function getAdminResources(filter: {
  year?: number;
  semester?: number;
  subject?: string;
  type?: ResourceType;
  search?: string;
}): Promise<{ resources: ResourceDTO[]; totalCount: number }> {
  const rows = await repo.findAdminResources(filter);
  const resources = rows.map(mapResourceToDTO);
  return {
    resources,
    totalCount: resources.length,
  };
}

export async function createResource(
  adminIdentifier: string,
  data: CreateResourcePayload
): Promise<ResourceDTO> {
  const created = await repo.createResource({
    ...data,
    uploadedBy: adminIdentifier || 'Admin',
  });
  return mapResourceToDTO(created);
}

export async function updateResource(
  id: string,
  data: UpdateResourcePayload
): Promise<ResourceDTO> {
  const existing = await repo.findResourceById(id);
  if (!existing) {
    throw new NotFoundError('Resource not found');
  }

  const updated = await repo.updateResource(id, data);
  return mapResourceToDTO(updated);
}

export async function deleteResource(id: string): Promise<{ success: boolean; id: string }> {
  const existing = await repo.findResourceById(id);
  if (!existing) {
    throw new NotFoundError('Resource not found');
  }

  await repo.deleteResource(id);
  return { success: true, id };
}
