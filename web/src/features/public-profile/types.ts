import { StudentSession } from '@/shared/types';

export interface PublicProfileProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export interface PublicProfileSkill {
  skill?: { name?: string | null } | null;
  name?: string | null;
}

export interface PublicProfileFields {
  biography?: string | null;
  bio?: string | null;
  skills?: Array<PublicProfileSkill | string> | null;
  photoUrl?: string | null;
  viewUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  photoZoom?: number | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  leetcodeUrl?: string | null;
  codechefUrl?: string | null;
  portfolioUrl?: string | null;
  specialQualities?: string | null;
}

export interface PublicProject {
  id: string;
  title: string;
  description?: string | null;
  techStack?: string[] | null;
  githubUrl?: string | null;
  videoUrl?: string | null;
  status?: string | null;
  isPublic?: boolean | null;
  readmeExcerpt?: string | null;
  stars?: number | null;
  primaryLanguage?: string | null;
  isFork?: boolean | null;
  source?: 'GITHUB' | 'MANUAL';
}

export interface PublicGithubSkill {
  id: string;
  skillId: string;
  name: string;
  category?: string | null;
  repoCount: number;
}

export interface PublicAchievement {
  id: string;
  title: string;
  description?: string | null;
  organization?: string | null;
  date?: string | null;
}

export interface PublicCertificate {
  id: string;
  title: string;
  issuer?: string | null;
  issueDate?: string | null;
  viewUrl?: string | null;
  fileUrl?: string | null;
}

export interface PublicResume {
  id: string;
  filename?: string | null;
  sizeMb?: number | null;
  viewUrl?: string | null;
  fileUrl?: string | null;
}

export interface PublicIntroVideo {
  streamUrl?: string | null;
  thumbnailUrl?: string | null;
  driveFileId?: string | null;
  previewUrl?: string | null;
}

export interface GithubSkill {
  name: string;
  category?: string | null;
  repoCount?: number | null;
  totalBytes?: string | null;
}

export interface PublicStudent {
  name?: string | null;
  rollNo?: string | null;
  year?: number | null;
  section?: string | null;
  status?: string | null;
  branch?: string | null;
  email?: string | null;
  profile?: PublicProfileFields | null;
  projects?: PublicProject[] | null;
  githubProjects?: PublicProject[] | null;
  githubSkills?: GithubSkill[] | null;
  achievements?: PublicAchievement[] | null;
  certificates?: PublicCertificate[] | null;
  resumes?: PublicResume[] | null;
  introVideo?: PublicIntroVideo | null;
}
