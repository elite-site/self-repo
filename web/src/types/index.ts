export interface StudentSubmission {
  id: string;
  studentId?: string;
  status: string;
  submittedAt: string;
  videoUploaded: boolean;
  videoUrl?: string | null;
  reviewText: string | null;
  reviewPros: string[];
  reviewCons: string[];
  reviewedAt: string | null;
  adminNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentProfile {
  id?: string;
  name: string;
  email: string | null;
  rollNo: string;
  year: number;
  section: string;
  branch: string;
  bio?: string;
  skills: string[];
  photoUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  submission?: StudentSubmission | null;
}

export interface StudentSession {
  token: string;
  student: StudentProfile;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  videoUrl?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  organization: string;
  category: string;
  proofUrl?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
  fileUrl: string;
  thumbnailUrl?: string;
  status: 'APPROVED' | 'PENDING';
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  eligibility: string;
  deadline: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  status: 'REGISTERED' | 'CONFIRMED' | 'PENDING' | 'WAITLISTED' | 'CANCELLED' | 'REJECTED';
  registeredAt: string;
}

export interface Team {
  id: string;
  name: string;
  members: string[]; // roll numbers or names
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  fromName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export interface VotingCampaign {
  id: string;
  title: string;
  description: string;
  endDate?: string;
  endsAt?: string;
  startsAt?: string;
  startDate?: string;
  status?: string;
  candidates?: VotingCandidate[];
  event?: any;
}

export interface VotingCandidate {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
  bio: string;
  year: number;
  section: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  status?: string;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}

