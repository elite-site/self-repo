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
  languages?: Record<string, number>;
  commitCount?: number;
  lastCommitAt?: Date | null;
  dependencies?: RepoDependency[];
  readmeExcerpt?: string | null;
  readmeFetchedAt?: Date | null;
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

export function stripReadme(rawText?: string | null): string | null {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText;
  // 1. Strip YAML front matter
  text = text.replace(/^---[\r\n]+[\s\S]*?[\r\n]+---[\r\n]*/m, '');
  // 2. Strip HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  // 3. Strip badge lines and image links
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[!\[.*?\]\(.*?\)\]\(.*?\)$/.test(trimmed)) continue;
    if (/^!\[.*?\]\(.*?\)$/.test(trimmed)) continue;
    if (/^<img\s+[^>]*>$/i.test(trimmed)) continue;
    if (/shields\.io|badge\.fury|codecov\.io|travis-ci|github\.com\/.*?\/workflows/i.test(trimmed)) continue;
    cleanedLines.push(line);
  }
  text = cleanedLines.join('\n').trim();
  if (!text) return null;
  if (text.length > 4000) {
    text = text.slice(0, 4000).trimEnd() + '…';
  }
  return text;
}

export function parseDependenciesFromManifests(
  packageJsonText?: string | null,
  requirementsTxtText?: string | null,
  pomXmlText?: string | null
): RepoDependency[] {
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

  if (packageJsonText) {
    try {
      const parsed = JSON.parse(packageJsonText);
      const allDeps = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
      };
      for (const dep of Object.keys(allDeps)) {
        addDep('npm', dep);
      }
    } catch {}
  }

  if (requirementsTxtText) {
    const lines = requirementsTxtText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
      const nameMatch = trimmed.match(/^([a-zA-Z0-9_\-\.]+)/);
      if (nameMatch && nameMatch[1]) {
        addDep('pip', nameMatch[1]);
      }
    }
  }

  if (pomXmlText) {
    const artifactMatches = pomXmlText.matchAll(/<artifactId>([^<]+)<\/artifactId>/g);
    for (const match of artifactMatches) {
      if (match[1]) {
        addDep('maven', match[1]);
      }
    }
  }

  return dependencies;
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

  async fetchUserReposGraphQL(username: string): Promise<GithubPublicRepoData[]> {
    if (!env.GITHUB_API_TOKEN) {
      throw new Error('GITHUB_API_TOKEN is required for GraphQL API');
    }

    const query = `
      query($login: String!, $cursor: String) {
        user(login: $login) {
          repositories(
            first: 100
            after: $cursor
            ownerAffiliations: [OWNER]
            privacy: PUBLIC
            orderBy: { field: PUSHED_AT, direction: DESC }
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              databaseId
              name
              description
              url
              isFork
              isEmpty
              createdAt
              pushedAt
              stargazerCount
              primaryLanguage {
                name
              }
              repositoryTopics(first: 10) {
                nodes {
                  topic {
                    name
                  }
                }
              }
              languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    name
                  }
                }
              }
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 1) {
                      totalCount
                      nodes {
                        committedDate
                      }
                    }
                  }
                }
              }
              readme: object(expression: "HEAD:README.md") {
                ... on Blob {
                  text
                }
              }
              packageJson: object(expression: "HEAD:package.json") {
                ... on Blob {
                  text
                }
              }
              requirementsTxt: object(expression: "HEAD:requirements.txt") {
                ... on Blob {
                  text
                }
              }
              pomXml: object(expression: "HEAD:pom.xml") {
                ... on Blob {
                  text
                }
              }
            }
          }
        }
        rateLimit {
          cost
          remaining
          resetAt
        }
      }
    `;

    const allRepos: GithubPublicRepoData[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;
    const maxRepos = 300;

    while (hasNextPage && allRepos.length < maxRepos) {
      const res = await this.fetchWithRateLimit('https://api.github.com/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query,
          variables: { login: username, cursor },
        }),
      });

      if (!res.ok) {
        throw new Error(`GitHub GraphQL API returned status ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      if (body.errors && body.errors.length > 0) {
        const msg = body.errors[0]?.message || 'GraphQL error';
        throw new Error(`GitHub GraphQL error: ${msg}`);
      }

      const data = body.data;
      if (data?.rateLimit) {
        const { remaining, resetAt } = data.rateLimit;
        if (typeof remaining === 'number') this.lastRateRemaining = remaining;
        if (resetAt) this.lastRateReset = Math.floor(new Date(resetAt).getTime() / 1000);
        if (typeof remaining === 'number' && remaining <= env.GITHUB_RATE_RESERVE) {
          throw new GithubRateLimitError(remaining, new Date(resetAt || Date.now() + 3600000));
        }
      }

      const userRepos = data?.user?.repositories;
      if (!userRepos || !Array.isArray(userRepos.nodes)) {
        break;
      }

      for (const node of userRepos.nodes) {
        if (!node) continue;
        const languagesMap: Record<string, number> = {};
        if (Array.isArray(node.languages?.edges)) {
          for (const edge of node.languages.edges) {
            if (edge?.node?.name && typeof edge?.size === 'number') {
              languagesMap[edge.node.name] = edge.size;
            }
          }
        }

        const commitHistory = node.defaultBranchRef?.target?.history;
        const commitCount = commitHistory?.totalCount || 0;
        const lastCommitDate = commitHistory?.nodes?.[0]?.committedDate;
        const lastCommitAt = lastCommitDate ? new Date(lastCommitDate) : null;

        const dependencies = parseDependenciesFromManifests(
          node.packageJson?.text,
          node.requirementsTxt?.text,
          node.pomXml?.text
        );

        const readmeExcerpt = stripReadme(node.readme?.text);

        allRepos.push({
          id: node.databaseId || 0,
          name: node.name,
          full_name: `${username}/${node.name}`,
          description: node.description || null,
          html_url: node.url,
          fork: Boolean(node.isFork),
          language: node.primaryLanguage?.name || null,
          topics: Array.isArray(node.repositoryTopics?.nodes)
            ? node.repositoryTopics.nodes.map((t: any) => t.topic?.name).filter(Boolean)
            : [],
          stargazers_count: typeof node.stargazerCount === 'number' ? node.stargazerCount : 0,
          created_at: node.createdAt,
          pushed_at: node.pushedAt || null,
          languages: languagesMap,
          commitCount,
          lastCommitAt,
          dependencies,
          readmeExcerpt,
          readmeFetchedAt: readmeExcerpt ? new Date() : null,
        });

        if (allRepos.length >= maxRepos) break;
      }

      hasNextPage = Boolean(userRepos.pageInfo?.hasNextPage);
      cursor = userRepos.pageInfo?.endCursor || null;
      if (!cursor) break;
    }

    return allRepos;
  }

  async fetchUserPublicRepos(username: string): Promise<GithubPublicRepoData[]> {
    const allRepos: GithubPublicRepoData[] = [];
    let page = 1;
    const maxPages = 3; // cap at 300 repos

    while (page <= maxPages) {
      const res = await this.fetchWithRateLimit(
        `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=100&page=${page}`
      );

      if (!res.ok) {
        if (res.status === 404 && page === 1) {
          throw new Error(`GitHub user '${username}' not found`);
        }
        if (page > 1) break;
        throw new Error(`GitHub API returned status ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        break;
      }

      for (const item of data) {
        allRepos.push({
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
        });
      }

      if (data.length < 100) break;
      page++;
    }

    return allRepos;
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

  public async fetchReadmeExcerpt(fullName: string): Promise<string | null> {
    try {
      const res = await this.fetchWithRateLimit(`/repos/${fullName}/readme`);
      if (res.ok) {
        const data: any = await res.json();
        if (data?.content && data.encoding === 'base64') {
          const raw = Buffer.from(data.content, 'base64').toString('utf8');
          return stripReadme(raw);
        }
      }
    } catch (err: any) {
      console.warn(`[fetchReadmeExcerpt] REST API failed for ${fullName}:`, err?.message);
    }

    for (const branch of ['HEAD', 'main', 'master']) {
      for (const file of ['README.md', 'readme.md', 'README', 'README.rst']) {
        try {
          const rawRes = await fetch(`https://raw.githubusercontent.com/${fullName}/${branch}/${file}`);
          if (rawRes.ok) {
            const raw = await rawRes.text();
            if (raw && raw.trim().length > 0) {
              return stripReadme(raw);
            }
          }
        } catch {
          // continue
        }
      }
    }

    return null;
  }
}

export const githubApiService = new GithubApiService();
