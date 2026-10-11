import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';

interface CreateRoleModalProps {
  isOpen: boolean;
  creating: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  creating,
  onClose,
  onCreate,
}) => {
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    onCreate(newRoleName, newRoleDesc);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
      <div className="bg-surface text-ink border border-edge rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-edge flex items-center justify-between">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Shield className="w-5 h-5 text-ink-brand" />
            Create Custom Security Role
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-sunken text-ink-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Role Identifier *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. EVENT_COORDINATOR"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Outline the responsibilities and scope for this role…"
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="pt-4 border-t border-edge flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-ink-secondary hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 text-xs font-bold text-on-primary bg-brand rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 cursor-pointer"
            >
              {creating ? 'Saving…' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
