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
        <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-neutral-500">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-elite-red" />
          Email Template Directory
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
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
                  ? 'bg-elite-red/5 dark:bg-elite-red/10 border-elite-red text-elite-red font-bold shadow-sm'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="text-xs font-bold truncate">{tpl.name}</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-1">{tpl.subject}</div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2">
          {selectedTemplate ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">Subject Line</span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">{selectedTemplate.subject}</h3>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">Available Merge Variables</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(selectedTemplate.variables || []).map((v) => (
                    <span key={v} className="px-2 py-0.5 font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded border border-neutral-200 dark:border-neutral-700">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">Message Body Content</span>
                <pre className="mt-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTemplate.body}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-neutral-400">Select a template to view details</div>
          )}
        </div>
      </div>
    </div>
  );
};
