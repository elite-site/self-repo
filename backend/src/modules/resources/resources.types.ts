import type { ResourceType } from '@prisma/client';

export type { ResourceType };

export interface ResourceDTO {
  id: string;
  title: string;
  year: number;
  semester: number;
  subject: string;
  type: ResourceType;
  driveLink: string;
  drive_link: string;
  previewUrl: string;
  downloadUrl: string;
  uploadedBy: string;
  uploaded_by: string;
  createdAt: string;
  created_at: string;
  isNew: boolean;
}

export interface StudentResourcesResponse {
  resources: ResourceDTO[];
  allowedSemesters: number[];
  currentSemester: number;
  accessRule: string;
  totalCount: number;
}

export interface CreateResourcePayload {
  title: string;
  year: number;
  semester: number;
  subject: string;
  type: ResourceType;
  drive_link?: string;
  driveLink?: string;
}

export interface UpdateResourcePayload {
  title?: string;
  year?: number;
  semester?: number;
  subject?: string;
  type?: ResourceType;
  drive_link?: string;
  driveLink?: string;
}

export interface ResourcesFilterParams {
  year?: number;
  semester?: number;
  subject?: string;
  type?: ResourceType;
  search?: string;
}
