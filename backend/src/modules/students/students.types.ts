export interface StudentProfileUpdateInput {
  bio?: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  skills?: string[];
  preferredRole?: string;
}

export interface StudentFilter {
  year?: number;
  section?: string;
  branch?: string;
  search?: string;
}

export { ChangeRequestInput } from './schemas/profile.schema';

