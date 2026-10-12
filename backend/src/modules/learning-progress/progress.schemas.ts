import { ValidationError } from '../../utils/appError';
import { LessonProgressPayload } from './progress.types';

export function parseProgressPayload(body: any): LessonProgressPayload {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const secondsWatched = Number(body.secondsWatched);
  const maxPositionSec = Number(body.maxPositionSec);

  if (Number.isNaN(secondsWatched) || secondsWatched < 0) {
    throw new ValidationError('secondsWatched must be a non-negative number', [
      { field: 'secondsWatched', message: 'Non-negative number required' },
    ]);
  }
  if (Number.isNaN(maxPositionSec) || maxPositionSec < 0) {
    throw new ValidationError('maxPositionSec must be a non-negative number', [
      { field: 'maxPositionSec', message: 'Non-negative number required' },
    ]);
  }

  return {
    secondsWatched: Math.floor(secondsWatched),
    maxPositionSec: Math.floor(maxPositionSec),
    completed: body.completed !== undefined ? Boolean(body.completed) : undefined,
  };
}
