export function validateProfileUpdate(body: any) {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid payload' };
  }
  return { ok: true, data: body };
}
