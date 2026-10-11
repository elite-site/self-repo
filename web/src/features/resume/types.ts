export interface ResumeData {
  id: string;
  status: string;
  filename?: string;
  fileUrl?: string;
  viewUrl?: string;
  previewUrl?: string | null;
  driveFileId?: string | null;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  reviewStatus?: string;
  reviewNotes?: string;
}
