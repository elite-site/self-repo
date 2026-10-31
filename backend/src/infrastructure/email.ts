import { env } from '../config/env';

export const emailEnabled = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS);
