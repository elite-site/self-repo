import { prisma } from '../../infrastructure/prisma';

export async function findAllCampaigns() {
  return prisma.votingCampaign.findMany();
}

export async function createCampaignRecord(data: any) {
  return prisma.votingCampaign.create({ data });
}

export async function updateCampaignRecord(id: string, data: any) {
  return prisma.votingCampaign.update({
    where: { id },
    data,
  });
}

export async function getCampaignVoteResults(campaignId: string) {
  return prisma.vote.groupBy({
    by: ['candidateId'],
    where: { campaignId },
    _count: { id: true },
  });
}

export async function findActiveCampaignsForStudent(studentId: string) {
  return prisma.votingCampaign.findMany({
    where: { status: { in: ['ACTIVE', 'SCHEDULED'] } },
    include: {
      candidates: true,
      event: true,
      votes: {
        where: { voterId: studentId },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCampaignByIdWithDetails(campaignId: string, studentId?: string) {
  const includeQuery: any = { candidates: true, event: true };
  if (studentId) {
    includeQuery.votes = { where: { voterId: studentId }, select: { id: true } };
  }

  return prisma.votingCampaign.findUnique({
    where: { id: campaignId },
    include: includeQuery,
  });
}

export async function findStudentsByIds(ids: string[]) {
  return prisma.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, rollNo: true, year: true, section: true },
  });
}

export async function findStudentStatusById(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: { status: true },
  });
}

export async function findCampaignById(campaignId: string) {
  return prisma.votingCampaign.findUnique({
    where: { id: campaignId },
  });
}

export async function executeVoteTransaction(
  campaignId: string,
  candidateId: string | undefined,
  studentId: string
) {
  const runVote = async (tx: any) => {
    const existingVote = await tx.vote.findFirst({
      where: { campaignId, voterId: studentId },
    });
    if (existingVote) {
      const err: any = new Error('ALREADY_VOTED');
      err.code = 'ALREADY_VOTED';
      throw err;
    }

    return await tx.vote.create({
      data: {
        campaignId,
        voterId: studentId,
        candidateId,
      },
    });
  };

  if (typeof prisma.$transaction === 'function') {
    const txResult = await prisma.$transaction(async (tx) => runVote(tx));
    return txResult !== undefined ? txResult : await runVote(prisma);
  }
  return await runVote(prisma);
}
