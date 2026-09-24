import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Certificate } from '../../types';
import { UploadCloud, Loader2, FileText } from 'lucide-react';

export const CertificatesTab = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCertificates().then(data => setCertificates(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#0B192C]">My Certificates</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors"><UploadCloud className="w-4 h-4"/> Upload</button>
      </div>
      {certificates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No certificates uploaded.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {certificates.map(c => (
            <div key={c.id} className="border border-[#E2E8F0] rounded-lg p-3 bg-white text-center">
              <div className="w-full aspect-square bg-slate-100 rounded mb-2 flex items-center justify-center">
                {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover rounded" /> : <FileText className="w-8 h-8 text-slate-300" />}
              </div>
              <h3 className="font-medium text-sm text-[#0B192C] truncate" title={c.title}>{c.title}</h3>
              <p className="text-xs text-slate-500">{c.issuer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
