import { env } from '../config/env';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { CODECHEF_LIMITS } from '../modules/codechef/codechef.constants';
import type {
  CodeChefApiSummary,
  CodeChefApiProfile,
  CodeChefApiContests,
  CodeChefApiStats,
  CodeChefApiHeatmap,
  CodeChefApiBadges,
} from '../modules/codechef/codechef.types';

function sanitizeString(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const cleaned = val.replace(/<[^>]*>/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeHttpsUrl(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (/^https:\/\/[a-zA-Z0-9_.\-~:/#?&=%+]+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function parseNumber(val: unknown): number | null {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') {
    const num = parseFloat(val);
    return Number.isNaN(num) ? null : num;
  }
  return null;
}

class Pacer {
  private lastRequestTime = 0;
  private activeCount = 0;

  async acquire(): Promise<void> {
    while (this.activeCount >= CODECHEF_LIMITS.MAX_CONCURRENCY) {
      await new Promise((r) => setTimeout(r, 50));
    }
    this.activeCount++;
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < CODECHEF_LIMITS.CLIENT_PACING_MS) {
      await new Promise((r) => setTimeout(r, CODECHEF_LIMITS.CLIENT_PACING_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  release(): void {
    if (this.activeCount > 0) this.activeCount--;
  }
}

const pacer = new Pacer();

export class CodeChefClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = (env.CODECHEF_STATS_BASE_URL || 'https://codechef-stats.tashif.codes').replace(/\/+$/, '');
  }

  private async request<T>(path: string, retries = 2): Promise<T | null> {
    await pacer.acquire();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CODECHEF_LIMITS.CLIENT_TIMEOUT_MS);

    try {
      const fullUrl = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': CODECHEF_LIMITS.USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (res.status === 404) return null;

      if (retries > 0 && (res.status === 429 || res.status >= 500)) {
        let backoffMs = 400 * Math.pow(2, 2 - retries);
        const retryAfter = res.headers.get('retry-after');
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 10) {
            backoffMs = parsed * 1000;
          }
        }
        logger.warn(`[CodeChefClient] Upstream status ${res.status} on ${path}. Retrying in ${backoffMs}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        pacer.release();
        return this.request<T>(path, retries - 1);
      }

      if (res.status === 429) {
        throw new AppError('UPSTREAM_FAILURE', 'CodeChef stats service is temporarily rate limited. Please try again shortly.', 429);
      }

      if (!res.ok) {
        logger.warn(`[CodeChefClient] Request returned status ${res.status} for ${path}`);
        return null;
      }

      const data = (await res.json()) as any;
      if (data && typeof data === 'object' && 'data' in data) {
        return data.data as T;
      }
      return data as T;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.name === 'AbortError') {
        logger.warn(`[CodeChefClient] Request timed out after ${CODECHEF_LIMITS.CLIENT_TIMEOUT_MS}ms for ${path}`);
      } else {
        logger.warn(`[CodeChefClient] Request failed for ${path}: ${err.message}`);
      }
      return null;
    } finally {
      clearTimeout(timer);
      pacer.release();
    }
  }

  async fetchSummary(handle: string): Promise<CodeChefApiSummary | null> {
    const raw = await this.request<any>(`/${encodeURIComponent(handle)}`);
    if (!raw) return null;
    return {
      totalSolved: parseNumber(raw.totalSolved) ?? 0,
      totalActiveDays: parseNumber(raw.totalActiveDays) ?? 0,
      totalContests: parseNumber(raw.totalContests) ?? 0,
      currentRating: parseNumber(raw.currentRating),
      maxRating: parseNumber(raw.maxRating),
      rank: sanitizeString(raw.rank),
      badgesCount: parseNumber(raw.badgesCount) ?? 0,
    };
  }

  async fetchProfile(handle: string): Promise<CodeChefApiProfile | null> {
    const raw = await this.request<any>(`/${encodeURIComponent(handle)}/profile`);
    if (!raw) return null;
    const social = raw.social && typeof raw.social === 'object' ? raw.social : {};
    return {
      displayName: sanitizeString(raw.displayName),
      username: sanitizeString(raw.username) || handle,
      avatar: sanitizeHttpsUrl(raw.avatar),
      country: sanitizeString(raw.country),
      countryFlag: sanitizeHttpsUrl(raw.countryFlag),
      institution: sanitizeString(raw.institution),
      company: sanitizeString(raw.company),
      bio: sanitizeString(raw.bio),
      websites: Array.isArray(raw.websites) ? raw.websites.map(sanitizeString).filter((w: string | null): w is string => !!w) : [],
      social: {
        github: sanitizeString(social.github),
        twitter: sanitizeString(social.twitter),
        linkedin: sanitizeString(social.linkedin),
      },
      verified: Boolean(raw.verified),
    };
  }

  async fetchContests(handle: string): Promise<CodeChefApiContests | null> {
    const raw = await this.request<any>(`/${encodeURIComponent(handle)}/contests`);
    if (!raw) return null;
    const history = Array.isArray(raw.history) ? raw.history : [];
    return {
      count: parseNumber(raw.count) ?? history.length,
      rating: parseNumber(raw.rating),
      maxRating: parseNumber(raw.maxRating),
      rank: sanitizeString(raw.rank),
      globalRanking: parseNumber(raw.globalRanking),
      topPercentage: parseNumber(raw.topPercentage),
      history: history.map((c: any) => ({
        name: sanitizeString(c.name) || 'Contest',
        date: sanitizeString(c.date) || '',
        timestamp: parseNumber(c.timestamp) ?? 0,
        rating: parseNumber(c.rating),
        ranking: parseNumber(c.ranking),
        problemsSolved: parseNumber(c.problemsSolved),
        totalProblems: parseNumber(c.totalProblems),
      })),
    };
  }

  async fetchStats(handle: string): Promise<CodeChefApiStats | null> {
    const raw = await this.request<any>(`/${encodeURIComponent(handle)}/stats`);
    if (!raw) return null;
    const byDifficulty: Record<string, number> = {};
    if (raw.byDifficulty && typeof raw.byDifficulty === 'object') {
      for (const [k, v] of Object.entries(raw.byDifficulty)) {
        byDifficulty[k] = parseNumber(v) ?? 0;
      }
    }
    const topicAnalysis = Array.isArray(raw.topicAnalysis)
      ? raw.topicAnalysis.map((t: any) => ({
          topic: sanitizeString(t.topic) || '',
          count: parseNumber(t.count) ?? 0,
        })).filter((t: { topic: string }) => t.topic.length > 0)
      : [];
    return {
      totalSolved: parseNumber(raw.totalSolved) ?? 0,
      totalQuestions: parseNumber(raw.totalQuestions),
      acceptanceRate: parseNumber(raw.acceptanceRate),
      byDifficulty,
      topicAnalysis,
    };
  }

  async fetchHeatmap(handle: string): Promise<CodeChefApiHeatmap | null> {
    const raw = await this.request<any>(`/${encodeURIComponent(handle)}/heatmap`);
    if (!raw) return null;
    const dailyContributions = Array.isArray(raw.dailyContributions)
      ? raw.dailyContributions.map((d: any) => ({
          date: sanitizeString(d.date) || '',
          count: parseNumber(d.count) ?? 0,
          level: parseNumber(d.level) ?? 0,
        })).filter((d: { date: string }) => d.date.length > 0)
      : [];
    return {
      totalSubmissions: parseNumber(raw.totalSubmissions) ?? 0,
      totalActiveDays: parseNumber(raw.totalActiveDays) ?? 0,
      currentStreak: parseNumber(raw.currentStreak) ?? 0,
      longestStreak: parseNumber(raw.longestStreak) ?? 0,
      dailyContributions,
      yearlyContributions: Array.isArray(raw.yearlyContributions) ? raw.yearlyContributions : [],
    };
  }

  async fetchBadges(handle: string): Promise<CodeChefApiBadges | null> {
    const raw = await this.request<any>(`/${encodeURIComponent(handle)}/badges`);
    if (!raw) return null;
    const list = Array.isArray(raw.list)
      ? raw.list.map((b: any) => ({
          name: sanitizeString(b.name || b.title),
          title: sanitizeString(b.title || b.name),
          icon: sanitizeHttpsUrl(b.icon) || sanitizeString(b.icon),
          description: sanitizeString(b.description),
        }))
      : [];
    return {
      count: parseNumber(raw.count) ?? list.length,
      list,
    };
  }
}

export const codeChefClient = new CodeChefClient();
