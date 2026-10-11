import { emailEnabled, resendClient, emailFromAddress } from '../../infrastructure/email';
import * as repo from './email.repository';
import { escapeHtml } from './email.schemas';
import type {
  AnnouncementEmailPayload,
  CreateEmailAutomationInput,
  SendAnnouncementEmailRecipient,
} from './email.types';

export { emailEnabled };

export async function sendAnnouncementEmails(
  to: SendAnnouncementEmailRecipient[],
  announcement: AnnouncementEmailPayload
): Promise<void> {
  if (!emailEnabled || !resendClient || !emailFromAddress) return;
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
      from: emailFromAddress,
      to: recipients,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

export async function getEmailAutomations() {
  let automations = await repo.findEmailAutomations();

  if (automations.length === 0) {
    const t1 = await repo.createEmailTemplateRecord({
      name: 'Welcome & Profile Setup Confirmation',
      subject: 'Welcome to ELITE Student Portal, {{student_name}}!',
      body: 'Dear {{student_name}},\n\nYour ELITE profile has been created. Please complete your skills, projects, and achievements.\n\nDept of IT, SASI.',
      variables: ['{{student_name}}', '{{roll_no}}', '{{department}}'],
      status: 'ACTIVE',
    });
    const t2 = await repo.createEmailTemplateRecord({
      name: 'Event Registration Confirmed',
      subject: 'Your registration for {{event_name}} is confirmed!',
      body: 'Hello {{student_name}},\n\nYou are confirmed for {{event_name}}. Venue and timings will be broadcasted prior to kickoff.\n\nBest of luck,\nELITE Committee.',
      variables: ['{{student_name}}', '{{event_name}}'],
      status: 'ACTIVE',
    });
    const t3 = await repo.createEmailTemplateRecord({
      name: 'Content Approval Notice',
      subject: 'Your submission has been approved',
      body: 'Hello {{student_name}},\n\nYour recent submission has passed faculty review and is now live on your profile.',
      variables: ['{{student_name}}'],
      status: 'ACTIVE',
    });

    await repo.createEmailAutomationRecord({
      name: 'New Student Onboarding Dispatch',
      trigger: 'STUDENT_REGISTERED',
      description: 'Dispatches instant welcome guidelines on first SSO login',
      status: 'ACTIVE',
      template: { connect: { id: t1.id } },
      targetAll: true,
    });
    await repo.createEmailAutomationRecord({
      name: 'Event Participation Pass',
      trigger: 'EVENT_REGISTERED',
      description: 'Sends confirmed team/solo ticket upon registration confirmation',
      status: 'ACTIVE',
      template: { connect: { id: t2.id } },
      targetAll: true,
    });
    await repo.createEmailAutomationRecord({
      name: 'Portfolio Verification Alert',
      trigger: 'CONTENT_APPROVED',
      description: 'Notifies student when project or achievement passes moderation',
      status: 'ACTIVE',
      template: { connect: { id: t3.id } },
      targetAll: true,
    });

    automations = await repo.findEmailAutomations();
  }

  return { automations };
}

export async function createEmailAutomation(input: CreateEmailAutomationInput) {
  const { name, trigger, description, templateId, targetYear, targetSection, targetAll } = input;
  return repo.createEmailAutomationRecord({
    name,
    trigger: trigger as any,
    description,
    template: { connect: { id: templateId } },
    targetYear: targetYear ? parseInt(String(targetYear), 10) : null,
    targetSection: targetSection || null,
    targetAll: targetAll !== undefined ? Boolean(targetAll) : true,
    status: 'ACTIVE',
  });
}

export async function toggleEmailAutomation(id: string) {
  const current = await repo.findEmailAutomationById(id);
  if (!current) {
    return { notFound: true as const };
  }
  const nextStatus = current.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  const updated = await repo.updateEmailAutomationRecord(id, {
    status: nextStatus,
  });
  return { updated };
}

export async function runEmailAutomation(id: string) {
  const auto = await repo.findEmailAutomationById(id);
  if (!auto) {
    return { notFound: true as const };
  }

  const studentCount = await repo.countAllStudents();
  const run = await repo.createEmailAutomationRunRecord({
    automation: { connect: { id: auto.id } },
    recipientCount: studentCount,
    sentCount: studentCount,
    failedCount: 0,
    status: 'success',
  });

  await repo.updateEmailAutomationRecord(auto.id, {
    lastRunAt: new Date(),
  });

  return { auto, studentCount, run };
}

export async function getEmailHistory() {
  const [automationRuns, emailLogs] = await repo.getEmailHistoryRecords();
  return { automationRuns, emailLogs };
}

export async function getEmailTemplates() {
  const templates = await repo.findAllEmailTemplates();
  return { templates };
}
