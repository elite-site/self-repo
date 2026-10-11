export type EventStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface EventItem {
  id: string;
  name: string;
  slug: string;
  year: number;
  status: EventStatus;
  description?: string | null;
  type?: string;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventDate?: string | null;
  eligibilityYears?: number[];
  minCompletion?: number;
  teamEnabled?: boolean;
  teamMin?: number;
  teamMax?: number;
  notifyOnOpen?: boolean;
  notifyReminder?: boolean;
  registrationCount?: number;
}

export interface EventPayload {
  name: string;
  description?: string;
  type?: string;
  year?: number;
  status?: string;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventDate?: string | null;
  eligibilityYears?: number[];
  minCompletion?: number;
  teamEnabled?: boolean;
  teamMin?: number;
  teamMax?: number;
  notifyOnOpen?: boolean;
  notifyReminder?: boolean;
}

export interface FormState {
  name: string;
  description: string;
  type: string;
  year: number;
  status: string;
  registrationStart: string;
  registrationEnd: string;
  eventDate: string;
  eligibilityYears: string[];
  minCompletion: number;
  teamEnabled: boolean;
  teamMin: number;
  teamMax: number;
  notifyOnOpen: boolean;
  notifyReminder: boolean;
}

export interface VotingCampaign {
  id: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'FINALIZED';
  votingStart: string;
  votingEnd: string;
  totalVotes: number;
  candidateCount: number;
  eventId?: string;
  eventTitle?: string;
}

export interface CandidateResult {
  id: string;
  name: string;
  rollNo: string;
  year: number;
  section: string;
  votes: number;
  percentage: number;
}

export interface CampaignResult {
  id: string;
  title: string;
  status: string;
  totalVotes: number;
  totalEligible: number;
  participationRate: number;
  candidates: CandidateResult[];
}

export interface CampaignOption {
  id: string;
  title: string;
  status: string;
}
