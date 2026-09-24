import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import { Link } from 'react-router-dom';
import { Search, Filter, Loader2, Users } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export const StudentDirectoryPage = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getPublicStudents().then(data => setStudents(data)).catch(()=>setStudents([])).finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => 
    search === '' || 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar session={null} onLogout={()=>{}} onNavigate={()=>{}} />
      
      <div className="bg-[#0B192C] text-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Student Directory</h1>
          <p className="text-slate-300 max-w-2xl mx-auto">Discover the amazing talent at ELITE. Browse portfolios, achievements, and projects of our students.</p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 shrink-0 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="font-bold text-[#0B192C] flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</h3>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Year</label>
                <select className="w-full mt-1 p-2 border border-[#E2E8F0] rounded text-sm"><option>All Years</option></select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Branch</label>
                <select className="w-full mt-1 p-2 border border-[#E2E8F0] rounded text-sm"><option>All Branches</option></select>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input type="text" placeholder="Search by name or roll number..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-[#E2E8F0] rounded-xl shadow-sm focus:outline-none focus:border-elite-red text-[#0B192C]" />
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white border border-[#E2E8F0] rounded-xl">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No students found</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(s => (
                  <Link to={`/students/${s.rollNo}`} key={s.rollNo} className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:shadow-lg transition-all group block text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 border-4 border-white shadow-sm mb-4 overflow-hidden">
                      {s.photoUrl ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-400">{s.name.charAt(0)}</div>}
                    </div>
                    <h3 className="font-bold text-[#0B192C] text-lg group-hover:text-elite-red transition-colors">{s.name}</h3>
                    <p className="text-sm text-slate-500 mb-4">{s.branch} • Year {s.year}</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {s.skills?.slice(0,3).map(sk => <span key={sk} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">{sk}</span>)}
                      {s.skills?.length > 3 && <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-bold rounded">+{s.skills.length - 3}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
