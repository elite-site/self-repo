export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'WAITLISTED';
export type TeamStatus = 'FORMING' | 'ACTIVE' | 'COMPLETE' | 'REJECTED';

export interface RegistrationAnswerItem {
  id: string;
  fieldId: string;
  value: string | null;
  field: {
    id: string;
    label: string;
    fieldType: string;
  };
}

export interface RegistrationTeamMember {
  id: string;
  studentId: string;
  student: {
    id: string;
    rollNo: string;
    name: string;
    email?: string | null;
    year: number;
    section: string;
    branch?: string;
  };
  joinedAt?: string;
}

export interface RegistrationTeam {
  id: string;
  name: string;
  eventId: string;
  leaderId: string;
  status: TeamStatus;
  createdAt: string;
  updatedAt?: string;
  event?: {
    id: string;
    name: string;
  };
  leader?: {
    id: string;
    rollNo: string;
    name: string;
    email?: string | null;
  } | null;
  members: RegistrationTeamMember[];
  invitations?: Array<{
    id: string;
    studentId: string;
    student: { id: string; rollNo: string; name: string; email?: string | null };
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    invitedAt: string;
  }>;
  registrations?: Array<{
    id: string;
    student: { id: string; rollNo: string; name: string };
  }>;
}

export interface RegistrationItem {
  id: string;
  eventId: string;
  studentId: string;
  status: RegistrationStatus;
  teamId?: string | null;
  registeredAt: string;
  updatedAt: string;
  student: {
    id: string;
    rollNo: string;
    name: string;
    email: string | null;
    year: number;
    section: string;
    branch: string;
  };
  event: {
    id: string;
    name: string;
    slug: string;
    year: number;
    status: string;
  };
  team: RegistrationTeam | null;
  answers: RegistrationAnswerItem[];
}

export interface RegistrationStats {
  total: number;
  confirmed: number;
  pending: number;
  waitlisted: number;
  cancelled: number;
  rejected: number;
  totalTeams?: number;
  completedTeams?: number;
}

export interface RegistrationsResponse {
  registrations: RegistrationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: RegistrationStats;
}

export interface MemberToRemove {
  teamId: string;
  teamName: string;
  studentId: string;
  studentName: string;
  rollNo: string;
}
