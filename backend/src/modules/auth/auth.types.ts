export interface AdminLoginInput {
  username?: string;
  password?: string;
}

export interface AdminAuthPayload {
  userId: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface StudentAuthPayload {
  studentId: string;
  rollNo: string;
  name: string;
  email: string;
}
