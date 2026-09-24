import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StudentProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Save, Loader2, UploadCloud, X } from 'lucide-react';

export const EditProfilePage = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    api.getProfile().then(data => {
      setProfile(data);
      setBio(data.bio || '');
      setGithubUrl(data.githubUrl || '');
      setLinkedinUrl(data.linkedinUrl || '');
      setPortfolioUrl(data.portfolioUrl || '');
      setSkills(data.skills || []);
    }).catch(e => setError('Failed to load profile')).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await api.updateProfile({ ...profile, bio, githubUrl, linkedinUrl, portfolioUrl, skills });
      navigate('/profile');
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
    }
    setNewSkill('');
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400"/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B192C]">Edit Profile</h1>
        <button onClick={() => navigate('/profile')} className="text-sm text-slate-500 hover:text-[#0B192C]">Cancel</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2"><AlertCircle className="w-5 h-5"/>{error}</div>}

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-[#0B192C] mb-2">Bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              maxLength={300}
              className="w-full p-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-elite-red focus:ring-1 focus:ring-elite-red transition-all"
              rows={4}
              placeholder="Tell us about yourself..."
            />
            <div className="text-right text-xs text-slate-400 mt-1">{bio.length}/300</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0B192C] mb-2">Skills</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {skills.map(s => (
                <span key={s} className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700 flex items-center gap-1">
                  {s} <button type="button" onClick={() => setSkills(skills.filter(sk => sk !== s))} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSkill} onChange={e => setNewSkill(e.target.value)} type="text" placeholder="Add a skill" className="flex-1 p-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-elite-red" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
              <button type="button" onClick={addSkill} className="px-4 py-2 bg-slate-100 text-[#0B192C] rounded-lg text-sm font-medium hover:bg-slate-200">Add</button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#0B192C]">Social Links</h3>
            <div>
              <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} type="url" placeholder="GitHub URL" className="w-full p-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-elite-red" />
            </div>
            <div>
              <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} type="url" placeholder="LinkedIn URL" className="w-full p-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-elite-red" />
            </div>
            <div>
              <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} type="url" placeholder="Portfolio URL" className="w-full p-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-elite-red" />
            </div>
          </div>

        </div>
        <div className="bg-slate-50 p-4 border-t border-[#E2E8F0] flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-elite-red hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
