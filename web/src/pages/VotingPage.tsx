import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { VotingCampaign } from '../types';
import { Vote, Loader2, Clock, CheckCircle } from 'lucide-react';

export const VotingPage = () => {
  const [campaigns, setCampaigns] = useState<VotingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVotingCampaigns().then(data => setCampaigns(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B192C]">Student Voting</h1>
      
      {campaigns.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl">
          <Vote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-[#0B192C]">No active voting campaigns</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white border border-elite-red/20 rounded-xl overflow-hidden shadow-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-elite-red"></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-[#0B192C]">{c.title}</h3>
                  <span className="bg-red-50 text-elite-red px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Active</span>
                </div>
                <p className="text-slate-600 mb-6">{c.description}</p>
                
                <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">Ends on {new Date(c.endDate).toLocaleDateString()}</div>
                  <button className="bg-elite-red hover:bg-red-700 text-white px-4 py-2 rounded font-medium shadow-sm transition-colors text-sm">View Candidates</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
