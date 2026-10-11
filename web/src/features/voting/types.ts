export interface VotingCandidate {
  id: string;
  name?: string;
  rollNo?: string;
  bio?: string;
  photoUrl?: string | null;
  student?: {
    id?: string;
    name?: string;
    rollNo?: string;
    section?: string;
    profile?: {
      photoUrl?: string | null;
    };
  };
}

export interface VotingCampaign {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  candidates?: VotingCandidate[];
}
