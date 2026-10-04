import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { EmailTemplateItem } from '../types';
import { Mail } from 'lucide-react';

export const EmailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminApi.getEmailTemplates();
        setTemplates(res.templates || []);
        if (res.templates && res.templates.length > 0) {
          setSelectedTemplate(res.templates[0]);
        }
      } catch (err) {
        console.error('Failed to load templates', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-ink-muted">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-edge">
        <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Mail className="w-6 h-6 text-ink-brand" />
          Email Template Directory
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Review and preview variable bindings for outbound institutional correspondence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedTemplate?.id === tpl.id
                  ? 'bg-brand/5 border-brand text-ink-brand font-bold shadow-sm'
                  : 'bg-surface border-edge text-ink-secondary hover:border-edge-strong'
              }`}
            >
              <div className="text-xs font-bold truncate">{tpl.name}</div>
              <div className="text-xs text-ink-muted truncate mt-1">{tpl.subject}</div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2">
          {selectedTemplate ? (
            <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm space-y-4">
              <div>
                <span className="text-xs font-semibold text-ink-muted">Subject Line</span>
                <h3 className="text-base font-bold text-ink mt-0.5">{selectedTemplate.subject}</h3>
              </div>

              <div>
                <span className="text-xs font-semibold text-ink-muted">Available Merge Variables</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(selectedTemplate.variables || []).map((v) => (
                    <span key={v} className="px-2 py-0.5 font-mono text-xs bg-surface-sunken text-ink rounded border border-edge">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-ink-muted">Message Body Content</span>
                <pre className="mt-1.5 p-4 rounded-lg bg-surface-sunken border border-edge text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed">
                  {selectedTemplate.body}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-ink-muted">Select a template to view details</div>
          )}
        </div>
      </div>
    </div>
  );
};
