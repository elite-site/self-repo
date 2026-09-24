import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StudentProfile } from '../types';
import { Link } from 'react-router-dom';
import { Edit3, ExternalLink, AlertCircle, CheckCircle, Github, Linkedin, Globe } from 'lucide-react';

export const ProfilePage = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getProfile()
      .then(data => setProfile(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-32 bg-slate-200 rounded-lg"></div>
      <div className="h-64 bg-slate-200 rounded-lg"></div>
    </div>
  );

  if (error || !profile) return (
    <div className="text-center py-10">
      <AlertCircle className="w-10 h-10 text-elite-red mx-auto mb-3" />
      <h2>Error loading profile</h2>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0B192C]">My Profile</h1>
        <Link to="/profile/edit" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#0B192C] px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#E2E8F0]">
          <Edit3 className="w-4 h-4" /> Edit Profile
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="h-32 bg-slate-100 relative"></div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-sm">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400 bg-slate-100">
                  {profile.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0B192C]">{profile.name}</h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200">Roll No: {profile.rollNo}</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200">Year {profile.year}</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200">Sec {profile.section}</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200">{profile.branch}</span>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">About</h3>
              <p className="text-[#0B192C] text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-[#E2E8F0]">
                {profile.bio || <span className="text-slate-400 italic">No bio added yet.</span>}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Skills</h3>
              <div className="flex gap-2 flex-wrap">
                {profile.skills?.length > 0 ? (
                  profile.skills.map(s => <span key={s} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-medium">{s}</span>)
                ) : (
                  <span className="text-sm text-slate-400 italic">No skills added.</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Links</h3>
              <div className="flex gap-4">
                {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-[#0B192C] hover:text-elite-red font-medium"><Github className="w-4 h-4"/> GitHub</a>}
                {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-[#0B192C] hover:text-elite-red font-medium"><Linkedin className="w-4 h-4"/> LinkedIn</a>}
                {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-[#0B192C] hover:text-elite-red font-medium"><Globe className="w-4 h-4"/> Portfolio</a>}
                {!profile.githubUrl && !profile.linkedinUrl && !profile.portfolioUrl && <span className="text-sm text-slate-400 italic">No links added.</span>}
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <div className="text-center mt-6">
        <button className="text-sm text-slate-500 hover:text-[#0B192C] underline decoration-slate-300 underline-offset-4">Request Academic Detail Change</button>
      </div>
    </div>
  );
};
