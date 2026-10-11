export interface StudentSession {
  studentId: string;
  rollNo: string;
  name: string;
  email?: string;
  photoUrl?: string | null;
  role?: string;
}

export interface AuthState {
  session: StudentSession | null;
  authChecking: boolean;
  sessionError: string | null;
}
