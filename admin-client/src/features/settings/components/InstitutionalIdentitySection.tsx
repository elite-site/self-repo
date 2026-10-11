import React from 'react';
import { Building } from 'lucide-react';

interface InstitutionalIdentitySectionProps {
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export const InstitutionalIdentitySection: React.FC<InstitutionalIdentitySectionProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-1">
        <Building className="w-4 h-4 text-ink-brand" />
        Institutional Identity & Branding
      </h2>
      <p className="text-xs text-ink-muted mb-6">
        Configures display headers, certificates, and email signatures.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Portal Display Title
          </label>
          <input
            type="text"
            value={settings.portal_title || ''}
            onChange={(e) => onChange('portal_title', e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Academic Year
          </label>
          <input
            type="text"
            value={settings.academic_year || ''}
            onChange={(e) => onChange('academic_year', e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Institution Name
          </label>
          <input
            type="text"
            value={settings.institution_name || ''}
            onChange={(e) => onChange('institution_name', e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Department Name
          </label>
          <input
            type="text"
            value={settings.department_name || ''}
            onChange={(e) => onChange('department_name', e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>
    </div>
  );
};
