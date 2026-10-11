export type { PortfolioKind } from './portfolio.schemas';

export interface CreateProjectInput {
  title: string;
  description?: string;
  technologies?: string[];
  githubUrl?: string | null;
  driveVideoUrl?: string | null;
}

export interface CreateAchievementInput {
  title: string;
  description?: string;
  organization?: string;
  categoryId?: string;
  proofUrl?: string | null;
}

export interface CreateCertificateInput {
  title: string;
  issuer?: string;
}
