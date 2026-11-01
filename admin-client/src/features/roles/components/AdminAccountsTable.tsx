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
    <div className="surface border border-edge rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-edge flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-ink font-sans">
            Administrator Accounts & Role Assignment
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Assigned credentials with administrative access to this portal instance
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-brand-soft text-brand-soft-text border border-brand/20">
          {admins.length} Organizers
        </span>
      </div>

      <div className="table-responsive">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-sunken text-ink-secondary text-xs font-semibold border-b border-edge">
            <tr>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Email Address</th>
              <th className="px-5 py-3">System Access Role</th>
              <th className="px-5 py-3">Assigned Role Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {admins.map((adm) => {
              const isAssigning = assigningAdminId === adm.id;
              const matchingRole = roles.find((r) => r.name === adm.role);
              return (
                <tr key={adm.id} className="hover:bg-brand-soft/40 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-ink text-sm">
                    {adm.username}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-secondary">
                    {adm.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-surface-sunken text-ink border border-edge">
                      {adm.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={matchingRole ? matchingRole.id : ''}
                      disabled={isAssigning}
                      onChange={(e) => onAssign(adm.id, e.target.value)}
                      className="select text-xs min-h-[38px] px-3 py-1.5 cursor-pointer max-w-[200px]"
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

export default AdminAccountsTable;
