import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './voting.controller';

// Admin voting router
export const adminVotingRouter = Router();
adminVotingRouter.use(requireAdminAuth);
adminVotingRouter.get('/voting', asyncHandler(controller.listAdminCampaigns));
adminVotingRouter.post('/voting', asyncHandler(controller.createAdminCampaign));
adminVotingRouter.patch('/voting/:id', asyncHandler(controller.updateAdminCampaign));
adminVotingRouter.get('/voting/:id/results', asyncHandler(controller.getAdminCampaignResults));

// Student voting router
export const studentVotingRouter = Router();
studentVotingRouter.use(requireStudentAuth);
studentVotingRouter.get('/voting', asyncHandler(controller.getVotingCampaigns));
studentVotingRouter.get('/voting/:id', asyncHandler(controller.getVotingCampaignById));
studentVotingRouter.post(['/voting/:id/vote', '/voting/vote'], asyncHandler(controller.postVote));

export default adminVotingRouter;
