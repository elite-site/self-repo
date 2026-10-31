import { AppError } from '../../../utils/appError';
import { PortfolioKind, PORTFOLIO_META } from '../portfolio.schemas';
import {
  findGithubAccountByStudent,
  findShowcasedRepos,
  findGithubStudentSkills,
  findShowcaseCandidateRepos,
  promoteReposToShowcase,
  findProjectsByStudent,
  findStudentProfileWithSkills,
  findPortfolioItem,
  updatePortfolioItemVisibility,
} from '../portfolio.repository';

export async function getUnifiedPortfolio(studentId: string) {
  try {
    const [githubAccount, initialShowcased, computedSkills] = await Promise.all([
      findGithubAccountByStudent(studentId),
      findShowcasedRepos(studentId),
      findGithubStudentSkills(studentId),
    ]);

    if (githubAccount) {
      let showcasedRepos = initialShowcased;

      if (showcasedRepos.length === 0) {
        const candidateRepos = await findShowcaseCandidateRepos(studentId);

        if (candidateRepos.length > 0) {
          const sorted = [...candidateRepos].sort((a, b) => {
            const qA = (!a.isFork && (a.commitCount || 0) >= 1) ? 1 : 0;
            const qB = (!b.isFork && (b.commitCount || 0) >= 1) ? 1 : 0;
            if (qA !== qB) return qB - qA;
            if (b.stars !== a.stars) return b.stars - a.stars;
            const tA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
            const tB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
            return tB - tA;
          });

          const toPick = sorted.slice(0, 30);
          if (toPick.length > 0) {
            await promoteReposToShowcase(toPick.map((r) => r.id));
            showcasedRepos = await findShowcasedRepos(studentId);
          }
        }
      }

      return {
        source: 'GITHUB', connected: true,
        githubAccount: {
          login: githubAccount.login, avatarUrl: githubAccount.avatarUrl,
          lastSyncedAt: githubAccount.lastSyncedAt, syncStatus: githubAccount.syncStatus,
        },
        showcasedRepos: showcasedRepos.map((r) => ({ ...r, githubRepoId: String(r.githubRepoId) })),
        skills: computedSkills.map((s) => ({ ...s, name: s.skill.name, category: s.skill.category, totalBytes: String(s.totalBytes) })),
      };
    }

    const [projects, profile] = await Promise.all([
      findProjectsByStudent(studentId),
      findStudentProfileWithSkills(studentId),
    ]);

    return {
      source: 'LEGACY', connected: false, githubAccount: null, showcasedRepos: [],
      projects: projects.map((p) => ({ ...p, techStack: p.technologies, videoUrl: p.driveVideoUrl })),
      skills: profile?.skills || [],
    };
  } catch (err: any) {
    console.error(`[portfolio.service:getUnifiedPortfolio] Failed for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function togglePortfolioItemVisibility(
  studentId: string,
  kind: PortfolioKind,
  id: string,
  isPublic: boolean
) {
  try {
    const meta = PORTFOLIO_META[kind];
    const item = await findPortfolioItem(meta.model, id, studentId);
    if (!item) {
      throw new AppError('NOT_FOUND', `${meta.label} not found`, 404, 'portfolio.service:togglePortfolioItemVisibility');
    }

    if (isPublic && item.status !== 'APPROVED') {
      throw new AppError('NOT_APPROVED', `Only approved ${meta.label.toLowerCase()}s can be displayed on your public profile.`, 409, 'portfolio.service:togglePortfolioItemVisibility');
    }

    const updated = await updatePortfolioItemVisibility(meta.model, item.id, isPublic);

    return {
      success: true,
      isPublic: updated.isPublic,
      message: isPublic
        ? `${meta.label} is now visible on your public profile.`
        : `${meta.label} has been hidden from your public profile.`,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[portfolio.service:togglePortfolioItemVisibility] Failed for kind=${kind}, id=${id}, studentId=${studentId}:`, err);
    throw err;
  }
}
