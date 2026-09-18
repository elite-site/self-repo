import { Resend } from 'resend';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { renderWinnerTemplate } from './templates/winner.template';
import { renderThankYouTemplate } from './templates/thankyou.template';
import { WINNER_RANKS } from '../config/constants';

export type EmailTemplateType = 'WINNER' | 'PARTICIPANT_THANKYOU';

export interface SendEmailOptions {
  templateType: EmailTemplateType;
  submissionIds: string[];
  forceResend?: boolean; // if admin confirms resending to duplicate recipients
}

export interface EmailPreviewResult {
  subject: string;
  html: string;
  recipientName: string;
  recipientEmail: string;
}

class EmailService {
  private resend: Resend | null = null;
  private isMock = false;

  constructor() {
    if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 're_placeholder') {
      this.resend = new Resend(env.RESEND_API_KEY);
      this.isMock = false;
      console.log('✅ Resend email client initialized with API key');
    } else {
      console.log('ℹ️ Resend API key not set. Email service operating in mock/preview mode.');
      this.isMock = true;
    }
  }

  /**
   * Render preview HTML for a specific submission or mock data
   */
  public async previewTemplate(
    templateType: EmailTemplateType,
    submissionId?: string
  ): Promise<EmailPreviewResult> {
    let name = 'Sample Student';
    let email = 'student@example.com';
    let rankLabel = '1st Place';

    if (submissionId) {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
      });
      if (submission) {
        name = submission.name;
        email = submission.email;
        if (submission.winnerRank) {
          const matched = WINNER_RANKS.find((r) => r.rank === submission.winnerRank);
          rankLabel = matched ? matched.label : `${submission.winnerRank}th Place`;
        }
      }
    }

    let subject = '';
    let html = '';

    if (templateType === 'WINNER') {
      subject = `Congratulations, ${name} — You placed ${rankLabel}!`;
      html = renderWinnerTemplate({ name, rankLabel });
    } else {
      subject = `Thank you for your submission, ${name}!`;
      html = renderThankYouTemplate({ name });
    }

    return {
      subject,
      html,
      recipientName: name,
      recipientEmail: email,
    };
  }

  /**
   * Check for duplicate sends before sending
   */
  public async checkDuplicates(templateType: EmailTemplateType, submissionIds: string[]) {
    const existingLogs = await prisma.emailLog.findMany({
      where: {
        templateType,
        submissionId: { in: submissionIds },
        status: 'sent',
      },
      select: {
        submissionId: true,
        sentAt: true,
      },
    });

    return existingLogs;
  }

  /**
   * Send emails in batch, recording to EmailLog
   */
  public async sendBatch(options: SendEmailOptions) {
    const { templateType, submissionIds, forceResend } = options;

    // 1. Check duplicates if not forced
    const duplicates = await this.checkDuplicates(templateType, submissionIds);
    const duplicateMap = new Set(duplicates.map((d) => d.submissionId));

    if (duplicates.length > 0 && !forceResend) {
      return {
        hasDuplicates: true,
        duplicateCount: duplicates.length,
        message: `${duplicates.length} recipient(s) have already received this ${templateType} email. Confirmation required to resend.`,
        duplicates,
      };
    }

    // 2. Fetch all target submissions
    const submissions = await prisma.submission.findMany({
      where: { id: { in: submissionIds } },
    });

    const results: Array<{ submissionId: string; email: string; success: boolean; error?: string }> = [];

    for (const sub of submissions) {
      let rankLabel = 'Winner';
      if (sub.winnerRank) {
        const found = WINNER_RANKS.find((r) => r.rank === sub.winnerRank);
        rankLabel = found ? found.label : `${sub.winnerRank}th Place`;
      }

      const dbEvent = sub.eventId
        ? await prisma.event.findUnique({ where: { id: sub.eventId } })
        : null;
      const eventTitle = dbEvent ? dbEvent.name : 'Photography Club';

      const html =
        templateType === 'WINNER'
          ? renderWinnerTemplate({ name: sub.name, rankLabel })
          : renderThankYouTemplate({ name: sub.name });

      const subject =
        templateType === 'WINNER'
          ? `🏆 Congratulations, ${sub.name} — ${eventTitle} Winner!`
          : `✨ Thank You for Participating, ${sub.name} — ${eventTitle}`;

      try {
        if (!this.isMock && this.resend) {
          await this.resend.emails.send({
            from: env.EMAIL_FROM_ADDRESS,
            to: sub.email,
            subject,
            html,
          });
        } else {
          console.log(`[Mock Email Sent] To: ${sub.email} | Subject: "${subject}" | Template: ${templateType}`);
        }

        await prisma.emailLog.create({
          data: {
            eventId: sub.eventId || 'self-introduction-2026',
            submissionId: sub.id,
            templateType,
            status: 'sent',
          },
        });

        results.push({ submissionId: sub.id, email: sub.email, success: true });
      } catch (err: any) {
        console.error(`Failed to send email to ${sub.email}:`, err);
        await prisma.emailLog.create({
          data: {
            eventId: sub.eventId || 'self-introduction-2026',
            submissionId: sub.id,
            templateType,
            status: 'failed',
          },
        });

        results.push({
          submissionId: sub.id,
          email: sub.email,
          success: false,
          error: err?.message || 'Send failed',
        });
      }
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return {
      hasDuplicates: false,
      total: submissionIds.length,
      successfulCount,
      failedCount,
      results,
    };
  }
}

export const emailService = new EmailService();
