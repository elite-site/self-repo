import React from 'react';
import { Shield } from 'lucide-react';

interface SecurityAccessSectionProps {
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export const SecurityAccessSection: React.FC<SecurityAccessSectionProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-ink-brand" />
        Security & Authentication Domain
      </h2>
      <p className="text-xs text-ink-muted mb-6">
        Restrict student access to verified institutional email addresses.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Institutional Domain Whitelist
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted font-mono text-xs">@</span>
            <input
              type="text"
              value={settings.allowed_email_domain || ''}
              onChange={(e) => onChange('allowed_email_domain', e.target.value)}
              className="w-full pl-8 pr-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
            />
          </div>
          <span className="text-xs text-ink-muted mt-1 block">
            Google SSO logins will reject accounts outside this domain
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Auto-Approve Portfolio Projects
          </label>
          <select
            value={settings.auto_approve_projects || 'false'}
            onChange={(e) => onChange('auto_approve_projects', e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="true">Enabled (Bypass moderation queue)</option>
            <option value="false">Disabled (Require moderator approval)</option>
          </select>
          <span className="text-xs text-ink-muted mt-1 block">
            Whether student project portfolios publish immediately
          </span>
        </div>
      </div>
    </div>
  );
};
