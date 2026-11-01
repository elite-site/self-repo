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
    <div className="surface border border-edge rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-edge">
        <h3 className="text-base font-bold text-ink font-sans">
          Module Authorization Matrix
        </h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Operational boundary and privilege tiers across core portal domains
        </p>
      </div>

      <div className="table-responsive">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-sunken text-ink-secondary text-xs font-semibold border-b border-edge">
            <tr>
              <th className="px-5 py-3">Feature Domain</th>
              <th className="px-5 py-3 text-center">SUPER_ADMIN</th>
              <th className="px-5 py-3 text-center">ADMIN</th>
              <th className="px-5 py-3 text-center">MODERATOR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {defaultModules.map((mod) => (
              <tr key={mod.name} className="hover:bg-brand-soft/40 transition-colors">
                <td className="px-5 py-3.5 font-medium text-ink text-sm">
                  {mod.name}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-approved/15 text-status-approved border border-status-approved/20">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {mod.admin ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-approved/15 text-status-approved border border-status-approved/20">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-sunken text-ink-disabled">
                      <Minus className="w-3.5 h-3.5" />
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {mod.moderator ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-approved/15 text-status-approved border border-status-approved/20">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-sunken text-ink-disabled">
                      <Minus className="w-3.5 h-3.5" />
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

export default PermissionsMatrixTable;
