import { client } from '@/shared/api/client';
import type { StudyResource, ResourceType } from '@/shared/types';

export interface GetResourcesParams {
  semester?: number;
  type?: ResourceType;
  search?: string;
}

export interface StudentResourcesResponse {
  resources: StudyResource[];
  allowedSemesters: number[];
  currentSemester: number;
  accessRule: string;
  totalCount: number;
}

export interface AllowedSemestersResponse {
  allowedSemesters: number[];
  currentSemester: number;
  year: number;
  accessRule: string;
}

export const resourcesApi = {
  async getResources(params?: GetResourcesParams): Promise<StudentResourcesResponse> {
    const res = await client.get('/student/resources', { params });
    return res.data;
  },

  async getAllowedSemesters(): Promise<AllowedSemestersResponse> {
    const res = await client.get('/student/resources/semesters');
    return res.data;
  },
};
