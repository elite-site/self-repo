import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';
import { EmailTemplateItem } from '../types';

interface CreateAutomationModalProps {
  isOpen: boolean;
  templates: EmailTemplateItem[];
  creating: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    trigger: string;
    templateId: string;
    description?: string;
  }) => void;
}

export const CreateAutomationModal: React.FC<CreateAutomationModalProps> = ({
  isOpen,
  templates,
  creating,
  onClose,
  onCreate,
}) => {
  const [newName, setNewName] = useState('');
  const [newTrigger, setNewTrigger] = useState('STUDENT_REGISTERED');
  const [newDesc, setNewDesc] = useState('');
  const [newTemplateId, setNewTemplateId] = useState(templates[0]?.id || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTemplateId) return;
    onCreate({
      name: newName,
      trigger: newTrigger,
      templateId: newTemplateId,
      description: newDesc,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
      <div className="bg-surface text-ink border border-edge rounded-lg w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-edge flex items-center justify-between">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Zap className="w-5 h-5 text-ink-brand" />
            Configure New Automation Workflow
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
              Workflow Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hackathon Registration Ticket Dispatch"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Trigger Event Type *
            </label>
            <select
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="STUDENT_REGISTERED">STUDENT_REGISTERED (First SSO Profile Creation)</option>
              <option value="EVENT_REGISTERED">EVENT_REGISTERED (Individual or Team Registration)</option>
              <option value="CONTENT_APPROVED">CONTENT_APPROVED (Project or Achievement Verification)</option>
              <option value="DEADLINE_REMINDER">DEADLINE_REMINDER (Submission Nudge Broadcast)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Email Template Dispatch *
            </label>
            <select
              value={newTemplateId}
              onChange={(e) => setNewTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Operational Description
            </label>
            <textarea
              rows={2}
              placeholder="Provide context on when and why this rule executes..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
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
              {creating ? 'Saving...' : 'Deploy Automation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
