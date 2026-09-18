import { renderEmailLayout } from './layout';

export interface ThankYouEmailProps {
  name: string;
  eventName?: string;
}

export function renderThankYouTemplate({
  name,
  eventName = 'Self Introduction Auditions 2026',
}: ThankYouEmailProps): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0;">
        Thank You for Participating!
      </h2>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">
        ${eventName}
      </p>
    </div>

    <p>Dear <strong>${name}</strong>,</p>

    <p>
      Thank you for submitting your self introduction to the <strong>${eventName}</strong>. We truly appreciate the time, preparation, and confidence you brought to your clip.
    </p>

    <p>
      The panel was impressed by every single entry. Introducing yourself clearly and confidently is an essential life skill, and taking this step already sets you apart.
    </p>

    <div class="card">
      <div class="card-title">Stay Connected</div>
      <p style="margin: 0; font-size: 14px; color: #cbd5e1;">
        Look out for our mock interviews, personal branding sessions, and stage-communication workshops this semester. We would love to have you join us.
      </p>
    </div>

    <p>
      Keep practicing, keep smiling, and keep growing!
    </p>

    <p style="margin-top: 30px;">
      Warm regards,<br>
      <strong>Self Introduction Organizing Committee</strong>
    </p>
  `;

  return renderEmailLayout({
    title: `Thank you for your submission — ${eventName}`,
    previewText: `Thank you for submitting your introduction to ${eventName}.`,
    contentHtml: content,
  });
}