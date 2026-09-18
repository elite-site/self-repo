export interface SelfIntroductionSubmissionFormData {
  rollNo: string;
  video: File | null;
}

export interface StudentInfo {
  name: string;
  rollNo: string;
  branch: string;
  section: string;
  year: number;
  email: string;
}

export interface StudentLookupSubmission {
  id: string;
  hasVideo: boolean;
  rating?: string | null;
  submittedAt?: string;
}

export interface StudentLookupResponse {
  student: StudentInfo;
  submission: StudentLookupSubmission | null;
}

export interface SubmissionResponse {
  id: string;
  name: string;
  message: string;
}