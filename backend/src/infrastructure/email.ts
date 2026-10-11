import { Resend } from 'resend';
import { env } from '../config/env';

export const emailEnabled = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS);
export const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
export const emailFromAddress = env.EMAIL_FROM_ADDRESS;
