import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from '../../controllers/student/interactions.controller';

const router = Router();
router.use(requireStudentAuth);

// Voting
router.get('/voting', asyncHandler(controller.getVotingCampaigns));
router.get('/voting/:id', asyncHandler(controller.getVotingCampaignById));
router.post(['/voting/:id/vote', '/voting/vote'], asyncHandler(controller.postVote));

// Notifications
router.get('/notifications', asyncHandler(controller.getNotifications));
router.post('/notifications/read-all', asyncHandler(controller.markAllNotificationsRead));
router.patch('/notifications/read-all', asyncHandler(controller.markAllNotificationsRead));
router.patch('/notifications/:id/read', asyncHandler(controller.markNotificationRead));

// Announcements
router.get('/announcements/:id', asyncHandler(controller.getAnnouncementById));

// Registrations
router.get(['/registrations', '/registrations/all'], asyncHandler(controller.getRegistrations));
router.get('/registrations/:id', asyncHandler(controller.getRegistrationById));
router.post('/registrations/:id/cancel', asyncHandler(controller.cancelRegistration));

// Teams
router.get('/teams', asyncHandler(controller.getTeams));
router.post('/teams', asyncHandler(controller.createTeam));
router.delete('/teams/:id', asyncHandler(controller.deleteTeam));
router.post('/teams/:id/invite', asyncHandler(controller.inviteTeamMember));
router.get('/team-invitations', asyncHandler(controller.getTeamInvitations));
router.post('/team-invitations/:id/accept', asyncHandler(controller.acceptTeamInvitation));
router.post('/team-invitations/:id/decline', asyncHandler(controller.declineTeamInvitation));

export default router;
