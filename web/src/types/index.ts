export interface SelfIntroductionSubmissionFormData {
  name: string;
  rollNo: string;
  branch: string;
  section: string;
  year: number;
  email: string;
  video: File | null;
}

export interface SubmissionResponse {
  id: string;
  name: string;
  message: string;
}
