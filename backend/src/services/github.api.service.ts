import { env } from '../config/env';

export interface GithubPublicRepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  fork: boolean;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  created_at: string;
  pushed_at: string | null;
}

export interface RepoLanguagesResult {
  notModified: boolean;
  languages?: Record<string, number>;
  etag?: string | null;
}

export interface RepoDependency {
  ecosystem: string;
  name: string;
}

export class GithubRateLimitError extends Error {
  remaining: number;
  resetAt: Date;
  constructor(remaining: number, resetAt: Date) {
    super(`GitHub API rate reserve reached: ${remaining} remaining (reserve threshold: ${env.GITHUB_RATE_RESERVE}). Resets at ${resetAt.toISOString()}`);
    this.name = 'GithubRateLimitError';
    this.remaining = remaining;
    this.resetAt = resetAt;
  }
}

export class GithubApiService {
  private lastRateRemaining: number | null = null;
  private lastRateReset: number | null = null;
  private lastRateLimit: number | null = null;

  private async fetchWithRateLimit(url: string, init: RequestInit = {}): Promise<Response> {
    const nowSec = Math.floor(Date.now() / 1000);

    // If we have an active rate limit and remaining is <= reserve threshold, check if reset window passed
    // The reserve never exceeds 10% of the real quota, so a small quota cannot lock every sync out.
    const effectiveReserve =
      this.lastRateLimit !== null
        ? Math.min(env.GITHUB_RATE_RESERVE, Math.floor(this.lastRateLimit * 0.1))
        : env.GITHUB_RATE_RESERVE;
    if (this.lastRateRemaining !== null && this.lastRateRemaining <= effectiveReserve) {
      if (this.lastRateReset && nowSec < this.lastRateReset) {
        throw new GithubRateLimitError(this.lastRateRemaining, new Date(this.lastRateReset * 1000));
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Self-Introduction-Portal/1.0',
      'X-GitHub-Api-Version': env.GITHUB_API_VERSION,
      ...((init.headers as Record<string, string>) || {}),
    };

    if (env.GITHUB_API_TOKEN) {
      headers.Authorization = `Bearer ${env.GITHUB_API_TOKEN}`;
    }

    const fullUrl = url.startsWith('http') ? url : `https://api.github.com${url}`;
    const response = await fetch(fullUrl, { ...init, headers });

    // Only the "core" quota gates syncing. Other buckets (e.g. the small dependency-graph
    // bucket) have their own tiny limits and must not block unrelated calls.
    const resource = response.headers.get('x-ratelimit-resource') || 'core';
    const rem = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const limit = response.headers.get('x-ratelimit-limit');
    if (resource === 'core') {
      if (rem !== null) this.lastRateRemaining = parseInt(rem, 10);
      if (reset !== null) this.lastRateReset = parseInt(reset, 10);
      if (limit !== null) this.lastRateLimit = parseInt(limit, 10);
    }

    // 403 rate limit exceeded (core quota only; other buckets just fail that one call)
    if (response.status === 403 && rem === '0' && resource === 'core') {
      const resetDate = this.lastRateReset ? new Date(this.lastRateReset * 1000) : new Date(Date.now() + 3600000);
      throw new GithubRateLimitError(0, resetDate);
    }

    return response;
  }

  getRateLimitStatus() {
    return {
      remaining: this.lastRateRemaining,
      reset: this.lastRateReset ? new Date(this.lastRateReset * 1000) : null,
    };
  }

  async fetchUserPublicRepos(username: string): Promise<GithubPublicRepoData[]> {
    const res = await this.fetchWithRateLimit(
      `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=100`
    );

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`GitHub user '${username}' not found`);
      }
      throw new Error(`GitHub API returned status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      full_name: item.full_name,
      description: item.description || null,
      html_url: item.html_url,
      fork: Boolean(item.fork),
      language: item.language || null,
      topics: Array.isArray(item.topics) ? item.topics : [],
      stargazers_count: typeof item.stargazers_count === 'number' ? item.stargazers_count : 0,
      created_at: item.created_at,
      pushed_at: item.pushed_at || null,
    }));
  }

  async fetchRepoLanguages(owner: string, repo: string, etag?: string | null): Promise<RepoLanguagesResult> {
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    const res = await this.fetchWithRateLimit(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`, {
      headers,
    });

    if (res.status === 304) {
      return { notModified: true, etag };
    }

    if (!res.ok) {
      return { notModified: false, languages: {}, etag: null };
    }

    const languages = await res.json();
    return {
      notModified: false,
      languages: typeof languages === 'object' && languages !== null ? languages : {},
      etag: res.headers.get('etag'),
    };
  }

  async fetchRepoCommitStats(owner: string, repo: string): Promise<{ commitCount: number; lastCommitAt: Date | null }> {
    try {
      const res = await this.fetchWithRateLimit(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=1`
      );

      if (!res.ok) {
        return { commitCount: 0, lastCommitAt: null };
      }

      const commits = await res.json();
      let lastCommitAt: Date | null = null;
      if (Array.isArray(commits) && commits.length > 0) {
        const dateStr = commits[0]?.commit?.committer?.date || commits[0]?.commit?.author?.date;
        if (dateStr) lastCommitAt = new Date(dateStr);
      }

      const linkHeader = res.headers.get('link');
      if (linkHeader) {
        const lastMatch = linkHeader.match(/<[^>]+[?&]page=([0-9]+)[^>]*>;\s*rel="last"/);
        if (lastMatch && lastMatch[1]) {
          return { commitCount: parseInt(lastMatch[1], 10), lastCommitAt };
        }
      }

      return { commitCount: Array.isArray(commits) ? commits.length : 0, lastCommitAt };
    } catch {
      return { commitCount: 0, lastCommitAt: null };
    }
  }

  async fetchRepoDependencies(owner: string, repo: string): Promise<RepoDependency[]> {
    const dependencies: RepoDependency[] = [];
    const seen = new Set<string>();

    const addDep = (ecosystem: string, name: string) => {
      const cleanName = name.trim().toLowerCase();
      if (!cleanName) return;
      const key = `${ecosystem}:${cleanName}`;
      if (!seen.has(key)) {
        seen.add(key);
        dependencies.push({ ecosystem, name: cleanName });
      }
    };

    // 1. Try GitHub Dependency Graph SBOM API first
    try {
      const sbomRes = await this.fetchWithRateLimit(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dependency-graph/sbom`
      );
      if (sbomRes.ok) {
        const sbomData = await sbomRes.json();
        const packages = sbomData?.sbom?.packages;
        if (Array.isArray(packages)) {
          for (const pkg of packages) {
            const purl = pkg.externalRefs?.find((ref: any) => ref.referenceType === 'purl')?.referenceLocator || pkg.name;
            if (typeof purl === 'string') {
              const purlMatch = purl.match(/pkg:([a-zA-Z0-9_-]+)\/([^@#?]+)/);
              if (purlMatch) {
                const ecoRaw = purlMatch[1].toLowerCase();
                const eco = ecoRaw === 'pypi' ? 'pip' : ecoRaw;
                addDep(eco, decodeURIComponent(purlMatch[2]));
              } else if (purl.includes(':')) {
                const parts = purl.split(':');
                if (parts.length >= 2) addDep(parts[0].toLowerCase(), parts[1]);
              }
            }
          }
        }
        if (dependencies.length > 0) {
          return dependencies;
        }
      }
    } catch {
      // Fallback to manifest file scanning
    }

    // 2. Fallback to package.json (npm)
    try {
      const pkgRes = await this.fetchWithRateLimit(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/package.json`
      );
      if (pkgRes.ok) {
        const fileData = await pkgRes.json();
        if (fileData?.content && fileData.encoding === 'base64') {
          const raw = Buffer.from(fileData.content, 'base64').toString('utf8');
          const parsed = JSON.parse(raw);
          const allDeps = {
            ...(parsed.dependencies || {}),
            ...(parsed.devDependencies || {}),
          };
          for (const dep of Object.keys(allDeps)) {
            addDep('npm', dep);
          }
        }
      }
    } catch {
      // ignore
    }

    // 3. Fallback to requirements.txt (pip)
    try {
      const reqRes = await this.fetchWithRateLimit(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/requirements.txt`
      );
      if (reqRes.ok) {
        const fileData = await reqRes.json();
        if (fileData?.content && fileData.encoding === 'base64') {
          const raw = Buffer.from(fileData.content, 'base64').toString('utf8');
          const lines = raw.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
            const nameMatch = trimmed.match(/^([a-zA-Z0-9_\-\.]+)/);
            if (nameMatch && nameMatch[1]) {
              addDep('pip', nameMatch[1]);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // 4. Fallback to pom.xml (maven)
    try {
      const pomRes = await this.fetchWithRateLimit(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/pom.xml`
      );
      if (pomRes.ok) {
        const fileData = await pomRes.json();
        if (fileData?.content && fileData.encoding === 'base64') {
          const raw = Buffer.from(fileData.content, 'base64').toString('utf8');
          const artifactMatches = raw.matchAll(/<artifactId>([^<]+)<\/artifactId>/g);
          for (const match of artifactMatches) {
            if (match[1]) {
              addDep('maven', match[1]);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    return dependencies;
  }
}

export const githubApiService = new GithubApiService();
