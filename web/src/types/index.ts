export interface StudentSubmission {
  id: string;
  status: string;
  submittedAt: string;
  videoUploaded: boolean;
  reviewText: string | null;
  reviewPros: string[];
  reviewCons: string[];
  reviewedAt: string | null;
}

export interface StudentProfile {
  id: string;
  rollNo: string;
  email: string | null;
  name: string;
  year: number;
  section: string;
  branch: string;
  submission: StudentSubmission | null;
}

export interface StudentSession {
  token: string;
  student: StudentProfile;
}