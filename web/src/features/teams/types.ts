export interface TeamMember {
  student?: {
    id?: string;
    name?: string;
    rollNo?: string;
    photoUrl?: string | null;
  };
  name?: string;
  rollNo?: string;
}

export interface Team {
  id: string;
  name: string;
  isLeader?: boolean;
  event?: {
    id: string;
    name: string;
  };
  members?: TeamMember[];
}

export interface TeamInvitation {
  id: string;
  team?: {
    id: string;
    name: string;
  };
  event?: {
    id: string;
    name: string;
  };
}
