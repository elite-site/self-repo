import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Project } from '../../types';
import { Plus, Github, Loader2, AlertCircle, Trash2 } from 'lucide-react';

export const ProjectsTab = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then(data => setProjects(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#0B192C]">My Projects</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors"><Plus className="w-4 h-4"/> Add Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-slate-500 font-medium">No projects added yet.</p>
          <p className="text-xs text-slate-400 mt-1">Showcase your best work here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map(p => (
            <div key={p.id} className="border border-[#E2E8F0] rounded-xl p-5 hover:shadow-md transition-shadow relative group bg-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-[#0B192C]">{p.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : p.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2 mb-4">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {p.techStack.map(t => <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded border border-slate-200">{t}</span>)}
              </div>
              {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-elite-red"><Github className="w-4 h-4"/> Repository</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
