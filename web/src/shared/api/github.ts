import { client } from './client';

export interface GithubRepoReadme {
  id: string;
  readmeExcerpt: string | null;
}

export async function getGithubRepoReadme(repoId: string): Promise<GithubRepoReadme> {
  const res = await client.get(`/student/github/repos/${encodeURIComponent(repoId)}/readme`);
  return res.data;
}
