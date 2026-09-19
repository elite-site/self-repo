export interface SelfIntroductionSubmissionFormData {
  name: string;
  rollNo: string;
  year: number;
  section: string;
  email: string;
  phoneNo: string;
  video: File | null;
}

export interface SubmissionResponse {
  id: string;
  name: string;
  message: string;
}