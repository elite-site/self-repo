export interface SettingsResponse {
  settings: Record<string, string>;
}

export interface ChangeRequest {
  id: string;
  studentId: string;
  field: string;
  oldValue: string;
  newValue: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  createdAt: string;
}
