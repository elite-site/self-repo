export type ResourceType =
  | 'NOTES'
  | 'PPT'
  | 'QUESTION_PAPER'
  | 'LAB_MANUAL'
  | 'SYLLABUS'
  | 'OTHER';

export interface AdminResource {
  id: string;
  title: string;
  year: number;
  semester: number;
  subject: string;
  type: ResourceType;
  driveLink: string;
  drive_link?: string;
  previewUrl: string;
  downloadUrl: string;
  uploadedBy: string;
  uploaded_by?: string;
  createdAt: string;
  created_at?: string;
  isNew: boolean;
}

export interface ResourceFormData {
  title: string;
  year: number;
  semester: number;
  subject: string;
  type: ResourceType;
  drive_link: string;
}
