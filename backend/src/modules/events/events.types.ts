export interface EventFilter {
  status?: string;
  year?: number;
  section?: string;
  search?: string;
}

export interface CreateEventInput {
  name: string;
  description?: string;
  rules?: string;
  eventDate?: string | Date;
  registrationEnd?: string | Date;
  type?: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  category?: string;
  venue?: string;
  prizePool?: string;
  entryFee?: number;
  year?: number;
  section?: string;
  status?: string;
}

export interface RegisterForEventInput {
  studentId: string;
  eventId: string;
  teamId?: string;
  role?: string;
}
