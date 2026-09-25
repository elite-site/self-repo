import { Resend } from 'resend';
import { env } from '../config/env';

export const emailEnabled = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS);

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendAnnouncementEmails(
  to: Array<{ email: string | null; name?: string }>,
  announcement: { title: string; message: string }
): Promise<void> {
  if (!emailEnabled || !resendClient) return;
  const recipients = to
    .map((recipient) => (recipient.email || '').trim())
    .filter((email) => email !== '');
  if (recipients.length === 0) return;

  const subject = `Announcement: ${announcement.title}`;
  const html = `
    <h1>${escapeHtml(announcement.title)}</h1>
    <p>${escapeHtml(announcement.message).replace(/\n/g, '<br/>')}</p>
  `;

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM_ADDRESS,
      to: recipients,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}