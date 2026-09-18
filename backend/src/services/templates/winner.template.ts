import { renderEmailLayout } from './layout';

export interface WinnerEmailProps {
  name: string;
  rankLabel: string;
  eventName?: string;
  customNotes?: string;
}

export function renderWinnerTemplate({
  name,
  rankLabel,
  eventName = 'Self Introduction Auditions 2026',
  customNotes,
}: WinnerEmailProps): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge-rank">🏆 ${rankLabel} Winner</span>
      <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 12px 0 6px 0;">
        Congratulations, ${name}!
      </h2>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">
        ${eventName}
      </p>
    </div>

    <p>Dear <strong>${name}</strong>,</p>

    <p>
      On behalf of the Self Introduction panel, we are thrilled to inform you that your introduction has been awarded <strong>${rankLabel}</strong> in the <strong>${eventName}</strong>!
    </p>

    <p>
      The judges were thoroughly impressed by your clarity of speech, confidence, and presence. Standing out among the exceptional applicants this year is a significant achievement.
    </p>

    <div class="card">
      <div class="card-title">Next Steps & What Happens Next</div>
      <p style="margin: 0; font-size: 14px; color: #cbd5e1;">
        ${customNotes || 'You have been selected as a member. Please look out for further communication regarding campus activities and meet-and-greet sessions. Details will follow shortly.'}
      </p>
    </div>

    <p>
      Once again, congratulations on your outstanding introduction! We look forward to seeing you grow on stage.
    </p>

    <p style="margin-top: 30px;">
      Warm regards,<br>
      <strong>Self Introduction Organizing Committee</strong>
    </p>
  `;

  return renderEmailLayout({
    title: `Congratulations, ${name} — You won ${rankLabel}!`,
    previewText: `Congratulations! Your introduction placed ${rankLabel} in ${eventName}.`,
    contentHtml: content,
  });
}