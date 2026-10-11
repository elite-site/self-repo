import React from 'react';
import { Key, Users } from 'lucide-react';
import { RoleItem } from '../types';

interface RolesCardsGridProps {
  roles: RoleItem[];
}

export const RolesCardsGrid: React.FC<RolesCardsGridProps> = ({ roles }) => {
  return (
    <div>
      <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
        <Key className="w-4 h-4 text-ink-brand" />
        Defined System Roles
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => {
          const assignedCount = role.assignments?.length || 0;
          return (
            <div
              key={role.id}
              className="bg-surface border border-edge rounded-xl p-5 shadow-sm hover:border-edge-strong transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-surface-sunken text-ink border border-edge">
                    {role.name}
                  </span>
                  {role.isSystem && (
                    <span className="text-xs font-semibold text-ink-muted">
                      System Built-in
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-secondary mt-2 leading-relaxed">
                  {role.description || 'Custom administrative privilege bundle.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-edge flex items-center justify-between text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-ink-muted" />
                  {assignedCount} Assigned {assignedCount === 1 ? 'Admin' : 'Admins'}
                </span>
                <span className="text-xs text-status-approved font-semibold">
                  Full Scope
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
