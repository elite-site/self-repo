export interface GithubIntegrationFilter {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ShowcaseUpdateRequest {
  repoIds: string[];
}
