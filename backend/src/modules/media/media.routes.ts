import { Router } from 'express';
import * as controller from './media.controller';

export const mediaRouter = Router();

mediaRouter.get('/thumbnail/:type/:id', controller.getThumbnail);
mediaRouter.get('/:type/:fileId', controller.streamMedia);

export default mediaRouter;
