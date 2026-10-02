import React, { useEffect, useRef, useState } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { Certificate } from '../../types';
import { UploadCloud, Loader2, FileText, Trash2, ExternalLink, Globe, EyeOff } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

const statusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <span className="badge badge-approved">Approved</span>;
    case 'CHANGES_REQUESTED':
      return <span className="badge badge-changes">Revision requested</span>;
    case 'REJECTED':
      return <span className="badge badge-rejected">Rejected</span>;
    case 'PENDING':
      return <span className="badge badge-pending">Pending review</span>;
    default:
      return <span className="badge badge-draft">{status}</span>;
  }
};

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="space-y-3">
    <legend className="text-label-sm uppercase tracking-wider text-ink-muted">{title}</legend>
    {children}
  </fieldset>
);

export const CertificatesTab: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

  const loadCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCertificates();
      if (Array.isArray(data)) setCertificates(data);
    } catch {
      setError('We could not load your certificates. Check your connection and try again.');
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
    setTitleError(null);
    setModalOpen(true);
  };

  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Give this certificate a name.');
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
      showToast(`${title.trim()} added.`);
      loadCertificates();
    } catch (err: any) {
      const notice =
        err.response?.data?.message || 'We could not upload this certificate. Your details are still here — try again.';
      setModalError(notice);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (certificate: Certificate) => {
    const confirmed = await confirm({
      title: 'Delete this certificate?',
      description: `“${certificate.title}” will be removed from your portfolio. This cannot be undone.`,
      confirmLabel: 'Delete certificate',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.deleteCertificate(certificate.id);
      showToast('Certificate deleted.');
      loadCertificates();
    } catch {
      showToast('We could not delete that certificate. Try again.', 'error');
    }
  };

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
      const notice = err.response?.data?.message || 'We could not update the visibility of that certificate.';
      showToast(notice, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-headline-sm text-ink">
            Certificates{' '}
            <span className="font-sans text-body-sm font-normal text-ink-muted">{certificates.length}</span>
          </h2>
          <p className="mt-0.5 text-body-sm text-ink-secondary">
            Course completions, professional licences and workshop credentials.
          </p>
        </div>
        <button type="button" onClick={handleOpenModal} className="btn btn-primary shrink-0">
          <UploadCloud size={16} strokeWidth={2} aria-hidden="true" />
          <span>Upload certificate</span>
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={loadCertificates} />}

      {loading ? (
        <div aria-busy="true">
          <span className="sr-only" role="status">
            Loading your certificates
          </span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface space-y-3 p-4">
                <div className="skeleton h-28 w-full" />
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-4 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      ) : certificates.length === 0 && !error ? (
        <EmptyState
          icon={FileText}
          title="No certificates uploaded yet"
          description="Add course completions, professional licences and exam scorecards. A PDF or image is optional — a title and issuer are enough to start."
          action={
            <button type="button" onClick={handleOpenModal} className="btn btn-primary">
              <UploadCloud size={16} strokeWidth={2} aria-hidden="true" />
              <span>Upload certificate</span>
            </button>
          }
        />
      ) : certificates.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((c) => (
            <li key={c.id} className="surface flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                {statusBadge(c.status || 'PENDING')}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="btn btn-ghost px-1.5 py-1 text-ink-muted hover:text-status-rejected"
                    aria-label={`Delete ${c.title}`}
                  >
                    <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {c.thumbnailUrl && (
                <a
                  href={resolveMediaUrl(c.viewUrl || c.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block h-28 w-full overflow-hidden rounded-lg border border-edge bg-surface-sunken"
                >
                  <img
                    src={resolveMediaUrl(c.thumbnailUrl)}
                    alt={`Preview of ${c.title}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </a>
              )}

              <div className="mt-3 min-w-0 flex-1">
                <h3 className="font-heading text-label-lg font-semibold text-ink" title={c.title}>
                  {c.title}
                </h3>
                <p className="mt-0.5 text-body-sm text-ink-muted">{c.issuer || 'Issuing body'}</p>
                {c.status === 'CHANGES_REQUESTED' && (
                  <p className="mt-2 rounded-lg border border-status-changes bg-status-bg-changes px-3 py-2 text-body-sm text-status-changes">
                    <strong className="font-semibold">Faculty revision note: </strong>
                    <span>{c.reviewNote || 'Changes were requested on this certificate.'}</span>
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-edge pt-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  {c.isPublic ? (
                    <Globe size={14} strokeWidth={2} className="shrink-0 text-status-approved" aria-hidden="true" />
                  ) : (
                    <EyeOff size={14} strokeWidth={2} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  )}
                  <span className="truncate text-label-md text-ink-secondary">
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
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-base ease-standard disabled:cursor-not-allowed disabled:opacity-40 ${
                    c.isPublic ? 'bg-status-approved' : 'bg-edge'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface ring-0 transition-transform duration-base ease-standard ${
                      c.isPublic ? 'translate-x-4' : 'translate-x-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="mt-2">
                {c.viewUrl || c.fileUrl ? (
                  <a
                    href={resolveMediaUrl(c.viewUrl || c.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-label-md font-semibold text-ink-brand hover:text-brand-hover"
                  >
                    <span>View file</span>
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-label-md text-ink-muted">Verified record</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload certificate"
        description="A title is required. The file and issuer are optional."
        initialFocusRef={firstInputRef}
      >
        <form onSubmit={handleUploadCertificate} className="space-y-5" noValidate>
          {modalError && <ErrorState bare message={modalError} />}

          <FormSection title="Certificate">
            <div>
              <label htmlFor="certificate-title" className="label">
                Certificate name <span className="text-status-rejected">*</span>
              </label>
              <input
                id="certificate-title"
                ref={firstInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError(null);
                }}
                placeholder="AWS Certified Cloud Practitioner"
                className="input"
                aria-required="true"
                aria-invalid={Boolean(titleError)}
                aria-describedby={titleError ? 'certificate-title-error' : undefined}
              />
              {titleError && (
                <p id="certificate-title-error" className="error-text" role="alert">
                  {titleError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="certificate-issuer" className="label">
                Issuing authority
              </label>
              <input
                id="certificate-issuer"
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="Amazon Web Services"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="certificate-date" className="label">
                Issue date
              </label>
              <input
                id="certificate-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="input"
              />
            </div>
          </FormSection>

          <FormSection title="Document">
            <div>
              <label htmlFor="certificate-file" className="label">
                PDF or image <span className="text-ink-muted">(optional)</span>
              </label>
              <input
                id="certificate-file"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full cursor-pointer text-label-sm text-ink-secondary file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-label-md file:font-semibold file:text-brand"
                aria-describedby="certificate-file-hint"
              />
              <p id="certificate-file-hint" className="hint">
                Accepted formats: PDF, JPEG, PNG or WebP.
              </p>
            </div>
          </FormSection>

          <div className="flex flex-wrap justify-end gap-3 border-t border-edge pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="btn btn-primary" aria-busy={uploading}>
              {uploading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              <span>{uploading ? 'Uploading…' : 'Save certificate'}</span>
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default CertificatesTab;
