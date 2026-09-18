export interface EmailLayoutProps {
  title: string;
  previewText: string;
  contentHtml: string;
}

export function renderEmailLayout({ title, previewText, contentHtml }: EmailLayoutProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b0f19;
      padding-bottom: 40px;
    }
    .main {
      background-color: #111827;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-radius: 12px;
      border: 1px solid #1f2937;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #090d16 0%, #172554 100%);
      padding: 36px 30px;
      text-align: center;
      border-bottom: 1px solid #1e293b;
    }
    .logo-badge {
      display: inline-block;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid #06b6d4;
      border-radius: 9999px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .content {
      padding: 36px 30px;
      font-size: 15px;
      line-height: 1.65;
      color: #cbd5e1;
    }
    .badge-rank {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #000000;
      font-weight: 800;
      font-size: 14px;
      padding: 6px 14px;
      border-radius: 8px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card {
      background-color: #1e293b;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
      border-left: 4px solid #06b6d4;
    }
    .card-title {
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      padding: 28px 20px;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#0b0f19;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>
  <table class="wrapper" role="presentation" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table style="width:100%;max-width:600px;margin-top:30px;" role="presentation">
          <tr>
            <td>
              <div class="main">
                <div class="header">
                  <div class="logo-badge">👤 Self Introduction</div>
                  <h1 class="title">Self Introduction Auditions 2026</h1>
                </div>
                <div class="content">
                  ${contentHtml}
                </div>
              </div>
              <div class="footer">
                <p>Self Introduction • Department of Information Technology</p>
                <p>Follow us on <a href="https://instagram.com" target="_blank">Instagram</a> • Questions? Reply to this email</p>
                <p>© ${new Date().getFullYear()} Self Introduction. All rights reserved.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
