import { Request, Response } from 'express';
import { AppError } from '../../utils/appError';
import {
  validateRequiredId,
  validateVotePayload,
  validateNotificationPagination,
  validateTeamCreatePayload,
  validateTeamInvitePayload,
} from '../../validators/student/interactions.schema';
import * as votingService from '../../services/student/voting.service';
import * as notificationsService from '../../services/student/notifications.service';
import * as registrationsService from '../../services/student/registrations.service';
import * as teamsService from '../../services/student/teams.service';
import * as teamInvitationsService from '../../services/student/teamInvitations.service';

function getStudentId(req: Request): string {
  const studentId = req.student?.studentId || (req as any).studentId;
  if (!studentId) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return studentId;
}

export async function getVotingCampaigns(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const result = await votingService.getVotingCampaigns(studentId);
  res.json(result);
}

export async function getVotingCampaignById(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const id = validateRequiredId(req.params.id, 'Campaign ID');
  const result = await votingService.getVotingCampaignById(id, studentId);
  res.json(result);
}

export async function postVote(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const { campaignId, candidateId } = validateVotePayload(req.params.id, req.body);
  const vote = await votingService.castVote(campaignId, candidateId, studentId);
  res.status(201).json(vote);
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const pagination = validateNotificationPagination(req.query);
  const result = await notificationsService.getNotifications(studentId, pagination);
  res.json(result);
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const result = await notificationsService.markAllNotificationsRead(studentId);
  res.json(result);
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id);
  const result = await notificationsService.markNotificationRead(id, studentId);
  res.json(result);
}

export async function getAnnouncementById(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id, 'Announcement ID');
  const result = await notificationsService.getAnnouncementById(id, studentId);
  res.json(result);
}

export async function getRegistrations(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
  const result = await registrationsService.getRegistrations(studentId);
  res.json(result);
}

export async function getRegistrationById(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const result = await registrationsService.getRegistrationById(id, studentId);
  res.json(result);
}

export async function cancelRegistration(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id);
  const result = await registrationsService.cancelRegistration(id, studentId);
  res.json(result);
}

export async function getTeams(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const result = await teamsService.getTeams(studentId);
  res.json(result);
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const { name, eventId } = validateTeamCreatePayload(req.body, req.query);
  const result = await teamsService.createTeam(studentId, name, eventId);
  res.status(201).json(result);
}

export async function deleteTeam(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id);
  const result = await teamsService.deleteTeam(id, studentId);
  res.json(result);
}

export async function inviteTeamMember(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id);
  const { rollNo } = validateTeamInvitePayload(req.body);
  const result = await teamInvitationsService.inviteTeamMember(id, studentId, rollNo);
  res.status(result.status).json(result.invite);
}

export async function getTeamInvitations(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const result = await teamInvitationsService.getTeamInvitations(studentId);
  res.json(result);
}

export async function acceptTeamInvitation(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id);
  const result = await teamInvitationsService.acceptTeamInvitation(id, studentId);
  res.json(result);
}

export async function declineTeamInvitation(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const id = validateRequiredId(req.params.id);
  const result = await teamInvitationsService.declineTeamInvitation(id, studentId);
  res.json(result);
}
