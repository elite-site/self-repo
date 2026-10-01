import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  const modalTitleRef = useRef<HTMLHeadingElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

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

  // Focus management for modal
  useEffect(() => {
    if (modalOpen) {
      lastFocusedElement.current = document.activeElement as HTMLElement;
      setTimeout(() => firstInputRef.current?.focus(), 0);
    } else if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, [modalOpen]);

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
    if (!title.trim()) {
      setModalError('Please provide a certificate title.');
      return;
    }
    setUploading(true);
    setModalError(null);

    const formData = new FormData();
    if (selectedFile) formData.append('file', selectedFile);
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
      <div className="py-16 animate-fade-in">
        <BrandedLoading fullScreen={false} message="Loading Certificates..." />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-approved">Approved</span>;
      case 'CHANGES_REQUESTED':
        return <span className="badge badge-changes">Revision Requested</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected">Rejected</span>;
      case 'PENDING':
        return <span className="badge badge-pending">Pending Review</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-body-lg font-bold text-ink font-heading">Verified Credentials & Licenses</h2>
          <p className="text-body-sm text-ink-secondary">Official certificates from Coursera, NPTEL, AWS, Google, and department workshops</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="btn btn-primary"
          aria-label="Upload new certificate"
        >
          <UploadCloud className="w-4 h-4" aria-hidden="true" />
          <span>Upload Certificate</span>
        </button>
      </div>

      {error && (
        <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center gap-2 animate-fade-in" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* GRID */}
      {certificates.length === 0 ? (
        <div className="surface text-center py-16 px-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-brand" aria-hidden="true" />
          </div>
          <h3 className="text-body-lg font-bold text-ink font-heading">No certificates uploaded yet</h3>
          <p className="text-body-sm text-ink-secondary mt-1 max-w-sm mx-auto mb-4">
            Add course completion certificates, professional licenses, and exam scorecards. You can attach a PDF or image, or just save the title and issuer.
          </p>
          <button
            onClick={handleOpenModal}
            className="btn btn-primary"
          >
            <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upload Certificate</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {certificates.map((c) => (
            <div
              key={c.id}
              className="surface p-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(c.status || 'PENDING')}
                </div>

                <div>
                  <h3 className="font-bold text-body-sm text-ink font-heading line-clamp-1" title={c.title}>
                    {c.title}
                  </h3>
                  <p className="text-label-sm text-ink-secondary mt-0.5">{c.issuer || 'Issuing Body'}</p>
                  {c.status === 'CHANGES_REQUESTED' && (
                    <div className="p-2 bg-status-bg-changes border border-status-changes rounded-lg text-label-sm text-status-changes mt-2">
                      <strong className="font-bold">Faculty Revision Note: </strong>
                      <span>{c.reviewNote || 'The admin requested changes on this certificate.'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PUBLIC VISIBILITY TOGGLE */}
              <div className="pt-2.5 mt-2.5 border-t border-edge flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  {c.isPublic ? (
                    <Globe className="w-3.5 h-3.5 text-status-approved shrink-0" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-label-sm font-medium text-ink-secondary truncate">
                    {c.isPublic ? 'Public on profile' : 'Hidden from profile'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePublic(c.id, !c.isPublic)}
                  disabled={togglingId === c.id || c.status !== 'APPROVED'}
                  aria-label={
                    c.status === 'APPROVED'
                      ? c.isPublic
                        ? 'Hide from public profile'
                        : 'Show on public profile'
                      : 'Requires faculty approval to display publicly'
                  }
                  aria-pressed={c.isPublic}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-base ease-standard ${
                    c.isPublic ? 'bg-status-approved' : 'bg-edge'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm ring-0 transition-transform duration-base ease-standard ${
                      c.isPublic ? 'translate-x-4' : 'translate-x-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="pt-3 mt-3 border-t border-edge flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {(c.viewUrl || c.fileUrl) ? (
                    <a
                      href={resolveMediaUrl(c.viewUrl || c.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-label-sm font-bold text-brand hover:underline"
                    >
                      <span>View File</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-label-sm text-ink-muted">Verified Record</span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(c.id)}
                  className="btn btn-ghost p-1 text-ink-muted hover:text-status-rejected"
                  aria-label={`Delete ${c.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="surface max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal animate-scale-in text-left my-auto"
            ref={modalTitleRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-edge sticky -top-6 bg-surface pt-0 -mt-1 z-10">
              <h3 id="certificate-modal-title" className="text-body-lg font-bold text-ink font-heading">Upload Verified Certificate</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-ghost p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUploadCertificate} className="space-y-4 pt-4">
              {modalError && (
                <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label htmlFor="certificate-title" className="label">Certificate Name <span className="text-status-rejected" aria-hidden="true">*</span></label>
                <input
                  id="certificate-title"
                  ref={firstInputRef}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AWS Certified Cloud Practitioner"
                  className="input"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="certificate-issuer" className="label">Issuing Authority / Platform</label>
                <input
                  id="certificate-issuer"
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="e.g. Amazon Web Services / Coursera"
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="certificate-date" className="label">Issue Date</label>
                <input
                  id="certificate-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  Upload Document (PDF or Image) <span className="text-ink-muted text-[11px]">(optional)</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-label-sm text-ink-secondary file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-soft file:text-brand hover:file:bg-brand-soft/80 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-edge mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !title.trim()}
                  className="btn btn-primary"
                  aria-busy={uploading}
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{uploading ? 'Uploading...' : 'Save Certificate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CertificatesTab;
