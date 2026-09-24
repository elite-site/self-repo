import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Achievement } from '../../types';
import { Plus, Loader2, Trophy } from 'lucide-react';

export const AchievementsTab = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAchievements().then(data => setAchievements(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#0B192C]">My Achievements</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors"><Plus className="w-4 h-4"/> Add Achievement</button>
      </div>
      {achievements.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No achievements added.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {achievements.map(a => (
            <div key={a.id} className="p-4 border border-[#E2E8F0] rounded-lg bg-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#0B192C]">{a.title}</h3>
                <p className="text-sm text-slate-500">{a.organization} • {new Date(a.date).toLocaleDateString()}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded font-medium">{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
