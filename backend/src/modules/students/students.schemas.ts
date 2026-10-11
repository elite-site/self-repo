export * from './schemas/profile.schema';
export * from './schemas/interactions.schema';
export * from './schemas/video.schema';
export * from './schemas/resume.schema';

export function validateProfileUpdate(body: any) {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid payload' };
  }
  return { ok: true, data: body };
}
