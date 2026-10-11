import React from 'react';
import { Check, Minus } from 'lucide-react';

const defaultModules = [
  { name: 'Dashboard & Submissions', superAdmin: true, admin: true, moderator: true },
  { name: 'Student Portfolio Moderation', superAdmin: true, admin: true, moderator: true },
  { name: 'Event Registration & Teams', superAdmin: true, admin: true, moderator: false },
  { name: 'Campus Voting Management', superAdmin: true, admin: true, moderator: false },
  { name: 'Email Automations & Dispatches', superAdmin: true, admin: true, moderator: false },
  { name: 'Storage & Drive Infrastructure', superAdmin: true, admin: false, moderator: false },
  { name: 'Roles & Audit Security Logs', superAdmin: true, admin: false, moderator: false },
  { name: 'Institutional Portal Settings', superAdmin: true, admin: false, moderator: false },
];

export const PermissionsMatrixTable: React.FC = () => {
  return (
    <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-edge">
        <h3 className="text-sm font-bold text-ink">
          Module Authorization Matrix
        </h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Operational boundary across core portal components
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
            <tr>
              <th className="px-5 py-3">Feature Domain</th>
              <th className="px-5 py-3 text-center">SUPER_ADMIN</th>
              <th className="px-5 py-3 text-center">ADMIN</th>
              <th className="px-5 py-3 text-center">MODERATOR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge text-ink-secondary">
            {defaultModules.map((mod) => (
              <tr key={mod.name} className="hover:bg-surface-sunken/50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-ink">
                  {mod.name}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-bg-approved text-status-approved">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {mod.admin ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-bg-approved text-status-approved">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-sunken text-ink-muted">
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {mod.moderator ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-bg-approved text-status-approved">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-sunken text-ink-muted">
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
