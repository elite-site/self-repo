import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Users, Eye, Mail, RefreshCw, XCircle, Film } from 'lucide-react';
import { Submission } from '../types';
import { adminApi } from '../services/api';

interface WinnersViewProps {
  activeEventId: string;
  onSelectSubmission: (submission: Submission) => void;
  onNavigateToEmails: () => void;
}

export const WinnersView: React.FC<WinnersViewProps> = ({
  activeEventId,
  onSelectSubmission,
  onNavigateToEmails,
}) => {
  const [selectedMembers, setSelectedMembers] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSelectedMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSubmissions({
        eventId: activeEventId,
        isWinner: true,
        limit: 100,
      });
      setSelectedMembers(res.data);
    } catch (err) {
      console.error('Failed to load selected members', err);
    } finally {
      setLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    loadSelectedMembers();
  }, [loadSelectedMembers]);

  const handleRemoveSelection = async (sub: Submission) => {
    if (!confirm(`Are you sure you want to remove ${sub.name} from selected members?`)) return;
    try {
      const res = await adminApi.updateWinner(sub.id, false, null);
      if (res.success) {
        setSelectedMembers((prev) => prev.filter((m) => m.id !== sub.id));
      }
    } catch (err) {
      alert('Failed to update selection.');
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            Club Recruitment
          </div>
          <h1 className="text-3xl font-extrabold text-elite-black font-display tracking-tight mt-1">
            SELECTED MEMBERS
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-normal">
            Review the chosen candidates who will be accepted into ELITE Self Introduction.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={loadSelectedMembers}
            className="p-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors shadow-sm cursor-pointer"
            title="Refresh Selected"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-elite-red' : ''}`} />
          </button>

          <button
            onClick={onNavigateToEmails}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-elite-red hover:bg-elite-darkred text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Proceed to Email Notifications</span>
          </button>
        </div>
      </div>

      {/* 2. STATS BANNER */}
      <div className="bg-[#fafafa] border border-neutral-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-elite-black">
              {selectedMembers.length} Applicants Selected
            </div>
            <div className="text-xs text-neutral-500">
              Ready for club invitation and congratulatory email dispatch
            </div>
          </div>
        </div>
      </div>

      {/* 3. SELECTED APPLICANTS GRID */}
      {loading ? (
        <div className="p-16 text-center text-neutral-500 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Loading selected members...</span>
        </div>
      ) : selectedMembers.length === 0 ? (
        <div className="p-16 bg-white border border-neutral-200 rounded-2xl text-center space-y-3 shadow-sm">
          <Users className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-sm font-bold text-elite-black">No candidates selected yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Navigate to the Applicants roster, open an applicant's submitted intro video, and click "Select as ELITE Member".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {selectedMembers.map((sub) => {
            return (
              <div
                key={sub.id}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Video Preview Placeholder */}
                <div
                  onClick={() => onSelectSubmission(sub)}
                  className="aspect-[16/9] bg-neutral-900 overflow-hidden cursor-pointer relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-elite-red group-hover:border-elite-red transition-colors">
                      <Film className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <Eye className="w-4 h-4" />
                    <span>Watch Introduction</span>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-elite-red text-white text-[10px] font-bold uppercase tracking-wider">
                    Selected
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-bold text-elite-black hover:text-elite-red cursor-pointer" onClick={() => onSelectSubmission(sub)}>
                      {sub.name}
                    </h3>
                    <span className="font-mono text-xs text-neutral-500 font-semibold">
                      {sub.rollNo}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-600">
                    {sub.branch}-{sub.section} • Year {sub.year}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    {sub.email}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => onSelectSubmission(sub)}
                      className="text-xs font-semibold text-neutral-700 hover:text-elite-red flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Introduction</span>
                    </button>

                    <button
                      onClick={() => handleRemoveSelection(sub)}
                      className="text-xs font-semibold text-neutral-400 hover:text-elite-red transition-colors cursor-pointer"
                      title="Deselect"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
