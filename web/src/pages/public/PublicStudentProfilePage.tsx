import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import { Loader2, ArrowLeft, Github, Linkedin, Globe, FileText, Award, Briefcase } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export const PublicStudentProfilePage = () => {
  const { rollNo } = useParams();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rollNo) api.getPublicStudent(rollNo).then(data => setProfile(data)).catch(()=>setProfile(null)).finally(() => setLoading(false));
  }, [rollNo]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-elite-red"/></div>;

  if (!profile) return (
    <div className="min-h-screen flex flex-col">
      <Navbar session={null} onLogout={()=>{}} onNavigate={()=>{}} />
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-3xl font-bold text-[#0B192C] mb-2">Student Not Found</h1>
        <p className="text-slate-500 mb-6">The profile you're looking for doesn't exist or is not public.</p>
        <Link to="/students" className="px-6 py-2 bg-elite-red text-white font-medium rounded-lg">Back to Directory</Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar session={null} onLogout={()=>{}} onNavigate={()=>{}} />
      
      <div className="bg-[#0B192C] pt-12 pb-32">
        <div className="max-w-5xl mx-auto px-6">
          <Link to="/students" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-8 transition-colors"><ArrowLeft className="w-4 h-4"/> Back to Directory</Link>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto px-6 -mt-24 w-full pb-20">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden mb-8">
          <div className="p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden">
              {profile.photoUrl ? <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400">{profile.name.charAt(0)}</div>}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#0B192C] mb-2">{profile.name}</h1>
              <div className="text-lg text-slate-600 font-medium mb-4">{profile.branch} • Year {profile.year}</div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#0B192C] hover:text-white transition-colors"><Github className="w-5 h-5"/></a>}
                {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#0A66C2] hover:text-white transition-colors"><Linkedin className="w-5 h-5"/></a>}
                {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-elite-red hover:text-white transition-colors"><Globe className="w-5 h-5"/></a>}
              </div>
            </div>
            <div>
              <Link to={`/students/${profile.rollNo}/resume`} className="px-6 py-3 bg-elite-red hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"><FileText className="w-5 h-5"/> View Resume</Link>
            </div>
          </div>
          
          {profile.bio && (
            <div className="px-8 md:px-12 pb-12 border-t border-slate-100 pt-8">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">About Me</h3>
              <p className="text-[#0B192C] text-lg leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map(s => <span key={s} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-semibold">{s}</span>)}
                {(!profile.skills || profile.skills.length === 0) && <span className="text-slate-400 italic text-sm">No skills listed.</span>}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 md:p-8">
              <h3 className="text-xl font-bold text-[#0B192C] mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-elite-red"/> Featured Projects</h3>
              <div className="text-center py-10 text-slate-500">Projects will appear here.</div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 md:p-8">
              <h3 className="text-xl font-bold text-[#0B192C] mb-6 flex items-center gap-2"><Award className="w-5 h-5 text-elite-red"/> Achievements</h3>
              <div className="text-center py-10 text-slate-500">Achievements will appear here.</div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
