import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './media.controller';

export const mediaRouter = Router();

mediaRouter.get('/thumbnail/:type/:id', asyncHandler(controller.getThumbnail));
mediaRouter.get('/:type/:fileId', asyncHandler(controller.streamMedia));

export default mediaRouter;
