import React, { useEffect, useState, useRef } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { Certificate } from '../../types';
import { UploadCloud, Loader2, FileText, AlertCircle, Trash2, X, ExternalLink, Globe, EyeOff } from 'lucide-react';
import { BrandedLoading } from '../../components/BrandedLoading';

export const CertificatesTab: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCertificates();
      if (Array.isArray(data)) setCertificates(data);
    } catch {
      setError('Could not load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleOpenModal = () => {
    setTitle('');
    setIssuer('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setSelectedFile(null);
    setModalError(null);
    setModalOpen(true);
  };

  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFile) {
      setModalError('Please provide a certificate title and select a document.');
      return;
    }
    setUploading(true);
    setModalError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title.trim());
    formData.append('issuer', issuer.trim());
    formData.append('issueDate', issueDate || new Date().toISOString());

    try {
      await api.uploadCertificate(formData);
      setModalOpen(false);
      loadCertificates();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to upload certificate.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this certificate?')) return;
    try {
      await api.deleteCertificate(id);
      loadCertificates();
    } catch {
      alert('Failed to delete certificate.');
    }
  };

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleTogglePublic = async (id: string, newIsPublic: boolean) => {
    // Optimistic UI update
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPublic: newIsPublic } : c))
    );
    setTogglingId(id);

    try {
      await api.setCertificatePublic(id, newIsPublic);
    } catch (err: any) {
      // Revert on failure
      setCertificates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isPublic: !newIsPublic } : c))
      );
      alert(err.response?.data?.message || 'Failed to update certificate visibility.');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <BrandedLoading fullScreen={false} message="Loading Certificates..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] font-heading">Verified Credentials & Licenses</h2>
          <p className="text-xs text-[#475569]">Official certificates from Coursera, NPTEL, AWS, Google, and department workshops</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold rounded-lg transition-opacity shadow-xs cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Certificate</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-[#E11D48] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* GRID */}
      {certificates.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-[#E4E7F2] rounded-lg bg-[#F7F8FC]">
          <FileText className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#0F172A] font-heading">No certificates uploaded yet</h3>
          <p className="text-xs text-[#475569] mt-1 max-w-sm mx-auto mb-4">
            Upload course completion certificates, professional licenses, and exam scorecards in PDF or image format.
          </p>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-lg text-xs font-bold transition-opacity cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Certificate</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {certificates.map((c) => (
            <div
              key={c.id}
              className="border border-[#E4E7F2] rounded-lg p-4 bg-white hover:border-[#4F46E5]/40 hover:shadow-md transition-all flex flex-col justify-between text-left group shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="space-y-3">
                <div className="w-full aspect-[4/3] bg-[#F7F8FC] rounded-lg overflow-hidden flex items-center justify-center border border-[#E4E7F2] relative">
                  {c.thumbnailUrl ? (
                    <img src={resolveMediaUrl(c.thumbnailUrl)} alt={c.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-10 h-10 text-[#94A3B8]" />
                  )}
                  <span
                    className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      c.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.status === 'CHANGES_REQUESTED'
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {c.status === 'CHANGES_REQUESTED' ? 'Revision Requested' : (c.status || 'Pending')}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-xs text-[#0F172A] font-heading line-clamp-1" title={c.title}>
                    {c.title}
                  </h3>
                  <p className="text-[11px] text-[#475569] mt-0.5">{c.issuer || 'Issuing Body'}</p>
                  {c.status === 'CHANGES_REQUESTED' && (
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-[11px] text-orange-900 mt-2">
                      <strong className="font-bold">Faculty Revision Note: </strong>
                      <span>{c.reviewNote || 'The admin requested changes on this certificate.'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PUBLIC VISIBILITY TOGGLE */}
              <div className="pt-2.5 mt-2.5 border-t border-[#E4E7F2] flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  {c.isPublic ? (
                    <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  )}
                  <span className="text-[11px] font-medium text-[#475569] truncate">
                    {c.isPublic ? 'Public on profile' : 'Hidden from profile'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePublic(c.id, !c.isPublic)}
                  disabled={togglingId === c.id || c.status !== 'APPROVED'}
                  title={
                    c.status === 'APPROVED'
                      ? c.isPublic
                        ? 'Hide from public profile'
                        : 'Show on public profile'
                      : 'Requires faculty approval to display publicly'
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                    c.isPublic ? 'bg-emerald-600' : 'bg-neutral-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      c.isPublic ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-3 mt-3 border-t border-[#E4E7F2] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {(c.viewUrl || c.fileUrl) ? (
                    <a
                      href={resolveMediaUrl(c.viewUrl || c.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F46E5] hover:underline"
                    >
                      <span>View File</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-[#94A3B8]">Verified Record</span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1 text-[#94A3B8] hover:text-[#E11D48] transition-colors cursor-pointer rounded"
                  title="Delete certificate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl border border-[#E4E7F2] animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7F2]">
              <h3 className="text-base font-bold text-[#0F172A] font-heading">Upload Verified Certificate</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadCertificate} className="space-y-4 pt-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-[#E11D48] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">Certificate Name *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AWS Certified Cloud Practitioner"
                  className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">Issuing Authority / Platform</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="e.g. Amazon Web Services / Coursera"
                  className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">
                  Upload Document (PDF or Image) *
                </label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#475569] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#EEF2FF] file:text-[#4F46E5] hover:file:bg-[#E0E7FF] cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !title.trim() || !selectedFile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>{uploading ? 'Uploading...' : 'Save Certificate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesTab;
