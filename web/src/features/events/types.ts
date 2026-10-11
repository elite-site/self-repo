export interface EventRegistration {
  id: string;
  eventId: string;
  studentId?: string;
  status: string;
  registeredAt?: string;
  createdAt?: string;
  teamId?: string | null;
  team?: {
    id: string;
    name: string;
  } | null;
  event?: Event;
}

export function isActiveRegistration(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === 'REGISTERED' || s === 'CONFIRMED' || s === 'WAITLISTED' || s === 'ACTIVE';
}

export interface Event {
  id: string;
  title: string;
  name?: string;
  description?: string;
  date?: string;
  deadline?: string;
  type?: string;
  eligibility?: string;
  status?: string;
  year?: number;
  maxTeamSize?: number;
  minTeamSize?: number;
  registrationFields?: Array<{
    id: string;
    label: string;
    type?: string;
    required?: boolean;
    options?: string[];
  }>;
}

export type PublicEventDetail = Event;
