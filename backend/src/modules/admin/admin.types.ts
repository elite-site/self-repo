export interface SubmissionQueryParams {
  eventId?: string;
  page?: string;
  limit?: string;
  branch?: string;
  section?: string;
  year?: string;
  status?: string;
  rating?: string;
  search?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentRosterQueryParams {
  eventId?: string;
  page?: string;
  limit?: string;
  section?: string;
  year?: string;
  uploaded?: 'yes' | 'no';
  search?: string;
}

export interface CreateVotingCampaignInput {
  title: string;
  description?: string;
  rule?: string;
  fixedCount?: number | string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  eventId?: string;
}

export interface UpdateVotingCampaignInput {
  title?: string;
  description?: string;
  rule?: string;
  fixedCount?: number | string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  status?: string;
}

export interface CreateAnnouncementInput {
  title: string;
  message?: string;
  body?: string;
  content?: string;
  priority?: string;
  targetYear?: number | string;
  targetSection?: string;
  targetAll?: boolean;
  scheduledAt?: string | Date;
}
