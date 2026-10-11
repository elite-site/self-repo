import React from 'react';
import { AdminAccountItem, RoleItem } from '../types';

interface AdminAccountsTableProps {
  admins: AdminAccountItem[];
  roles: RoleItem[];
  assigningAdminId: string | null;
  onAssign: (adminId: string, roleId: string) => void;
}

export const AdminAccountsTable: React.FC<AdminAccountsTableProps> = ({
  admins,
  roles,
  assigningAdminId,
  onAssign,
}) => {
  return (
    <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-edge flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">
            Administrator Accounts & Role Assignment
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Assigned credentials with administrative access to this portal instance
          </p>
        </div>
        <span className="text-xs font-mono text-ink-muted">
          {admins.length} Organizers
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
            <tr>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Email Address</th>
              <th className="px-5 py-3">System Access Role</th>
              <th className="px-5 py-3">Assigned Role Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge text-ink-secondary">
            {admins.map((adm) => {
              const isAssigning = assigningAdminId === adm.id;
              return (
                <tr key={adm.id} className="hover:bg-surface-sunken/50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-ink">
                    {adm.username}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-ink-secondary">
                    {adm.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-sunken text-ink border border-edge">
                      {adm.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      disabled={isAssigning}
                      defaultValue={roles.find((r) => r.assignments?.some((a) => a.adminId === adm.id))?.id || ''}
                      onChange={(e) => {
                        if (e.target.value) onAssign(adm.id, e.target.value);
                      }}
                      className="px-2.5 py-1 text-xs rounded border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="">Default ({adm.role})</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
