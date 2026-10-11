import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';
import { EXCLUDE_INTERNAL_EVENT } from '../../config/constants';

export async function findOpenEvents(take: number = 100) {
  return prisma.event.findMany({
    where: {
      status: 'OPEN',
      ...EXCLUDE_INTERNAL_EVENT,
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function findEventByIdOrSlug(idOrSlug: string) {
  return prisma.event.findFirst({
    where: {
      OR: [
        { id: idOrSlug },
        { slug: idOrSlug },
      ],
    },
    include: {
      formFields: { orderBy: { displayOrder: 'asc' } },
    },
  });
}

export async function findAdminEvents() {
  return prisma.event.findMany({
    where: EXCLUDE_INTERNAL_EVENT,
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { registrations: true, submissions: true },
      },
    },
  });
}

export async function findPortalEvents() {
  return prisma.event.findMany({
    where: EXCLUDE_INTERNAL_EVENT,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { registrations: true, submissions: true },
      },
    },
  });
}

export async function findPortalEventDetail(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      formFields: { orderBy: { displayOrder: 'asc' } },
      teams: { include: { members: { include: { student: true } } } },
      _count: { select: { registrations: true } },
    },
  });
}

export async function findEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
  });
}

export async function findEventByIdWithSelect(id: string, select: Prisma.EventSelect) {
  return prisma.event.findUnique({
    where: { id },
    select,
  });
}

export async function createEventRecord(data: any) {
  return prisma.event.create({ data });
}

export async function updateEventRecord(id: string, data: any) {
  return prisma.event.update({
    where: { id },
    data,
  });
}

export async function deleteEventRecord(id: string) {
  return prisma.event.delete({ where: { id } });
}

// Registrations
export async function countRegistrations(where: Prisma.EventRegistrationWhereInput) {
  return prisma.eventRegistration.count({ where });
}

export async function findRegistrations(where: Prisma.EventRegistrationWhereInput, skip: number, take: number) {
  return prisma.eventRegistration.findMany({
    where,
    skip,
    take,
    orderBy: { registeredAt: 'desc' },
    include: {
      student: true,
      event: true,
      team: {
        include: {
          members: {
            include: {
              student: {
                select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
              }
            }
          }
        }
      },
      answers: {
        include: {
          field: true
        }
      }
    }
  });
}

export async function findRegistrationsForExport(where: Prisma.EventRegistrationWhereInput) {
  return prisma.eventRegistration.findMany({
    where,
    orderBy: { registeredAt: 'desc' },
    include: {
      student: true,
      event: true,
      team: true,
      answers: { include: { field: true } }
    }
  });
}

export async function findRegistrationById(id: string) {
  return prisma.eventRegistration.findUnique({
    where: { id },
    include: {
      student: true,
      event: true,
      team: {
        include: {
          members: {
            include: {
              student: {
                select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
              }
            }
          },
          invitations: {
            include: {
              student: {
                select: { id: true, rollNo: true, name: true, email: true }
              }
            }
          }
        }
      },
      answers: {
        include: {
          field: true
        }
      }
    }
  });
}

export async function updateRegistration(id: string, data: Prisma.EventRegistrationUpdateInput) {
  return prisma.eventRegistration.update({
    where: { id },
    data,
    include: {
      student: true,
      event: true,
      team: true,
      answers: { include: { field: true } }
    }
  });
}

export async function deleteRegistrationWithAnswers(id: string) {
  return prisma.$transaction([
    prisma.registrationAnswer.deleteMany({
      where: { registrationId: id }
    }),
    prisma.eventRegistration.delete({
      where: { id }
    })
  ]);
}

// Teams
export async function countTeams(where: Prisma.TeamWhereInput) {
  return prisma.team.count({ where });
}

export async function findTeams(where: Prisma.TeamWhereInput) {
  return prisma.team.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      event: true,
      members: {
        include: {
          student: {
            select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
          }
        }
      },
      invitations: {
        include: {
          student: {
            select: { id: true, rollNo: true, name: true, email: true }
          }
        }
      },
      registrations: {
        include: {
          student: {
            select: { id: true, rollNo: true, name: true }
          }
        }
      }
    }
  });
}

export async function updateTeam(id: string, data: Prisma.TeamUpdateInput) {
  return prisma.team.update({
    where: { id },
    data,
    include: {
      event: true,
      members: { include: { student: true } }
    }
  });
}

export async function findTeamById(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: { event: true }
  });
}

export async function findTeamMember(teamId: string, studentId: string) {
  return prisma.teamMember.findFirst({
    where: { teamId, studentId },
    include: { student: true }
  });
}

export async function removeTeamMemberTransaction(memberId: string, eventId: string, studentId: string, teamId: string) {
  return prisma.$transaction([
    prisma.teamMember.delete({
      where: { id: memberId }
    }),
    prisma.eventRegistration.updateMany({
      where: { eventId, studentId, teamId },
      data: { teamId: null }
    })
  ]);
}

// Students helper
export async function findStudentsByIds(ids: string[]) {
  return prisma.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, rollNo: true, name: true, email: true }
  });
}

export async function findStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
    select: { id: true, rollNo: true, name: true, email: true }
  });
}

// Portal event cascade delete & form fields
export async function countEventDependents(id: string) {
  const [registrations, submissions, formFields, teams, votes, emailLogs] = await Promise.all([
    prisma.eventRegistration.count({ where: { eventId: id } }),
    prisma.submission.count({ where: { eventId: id } }),
    prisma.registrationFormField.count({ where: { eventId: id } }),
    prisma.team.count({ where: { eventId: id } }),
    prisma.vote.count({ where: { campaign: { eventId: id } } }),
    prisma.emailLog.count({ where: { eventId: id } }),
  ]);
  return { registrations, submissions, formFields, teams, votes, emailLogs };
}

export async function deleteEventWithCascade(id: string, deps: { registrations: number; formFields: number; teams: number; votes: number; submissions: number; emailLogs: number }) {
  return prisma.$transaction(async (tx) => {
    if (deps.registrations > 0 || deps.formFields > 0) {
      await tx.registrationAnswer.deleteMany({
        where: { OR: [{ registration: { eventId: id } }, { field: { eventId: id } }] },
      });
    }
    if (deps.teams > 0) {
      await tx.teamMember.deleteMany({ where: { team: { eventId: id } } });
      await tx.teamInvitation.deleteMany({ where: { team: { eventId: id } } });
    }
    if (deps.votes > 0) {
      await tx.vote.deleteMany({ where: { campaign: { eventId: id } } });
      await tx.votingCandidate.deleteMany({ where: { campaign: { eventId: id } } });
      await tx.votingCampaign.deleteMany({ where: { eventId: id } });
    }
    if (deps.registrations > 0) {
      await tx.eventRegistration.deleteMany({ where: { eventId: id } });
    }
    if (deps.formFields > 0) {
      await tx.registrationFormField.deleteMany({ where: { eventId: id } });
    }
    if (deps.teams > 0) {
      await tx.team.deleteMany({ where: { eventId: id } });
    }
    if (deps.submissions > 0) {
      await tx.submission.deleteMany({ where: { eventId: id } });
    }
    if (deps.emailLogs > 0) {
      await tx.emailLog.deleteMany({ where: { eventId: id } });
    }
    return tx.event.delete({ where: { id } });
  }, { timeout: 20000, maxWait: 10000 });
}

export async function findPortalEventRegistrations(eventId: string) {
  return prisma.eventRegistration.findMany({
    where: { eventId },
    include: {
      student: true,
      event: true,
      team: {
        include: {
          members: {
            include: {
              student: {
                select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, status: true, graduatedAt: true },
              },
            },
          },
        },
      },
      answers: { include: { field: true } },
    },
    orderBy: { registeredAt: 'desc' },
  });
}

export async function createFormField(data: Prisma.RegistrationFormFieldUncheckedCreateInput) {
  return prisma.registrationFormField.create({ data });
}

export async function updateFormField(id: string, data: Prisma.RegistrationFormFieldUpdateInput) {
  return prisma.registrationFormField.update({
    where: { id },
    data,
  });
}

export async function deleteFormField(id: string) {
  return prisma.registrationFormField.delete({ where: { id } });
}
