import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { EventRegistration } from '../types';
import { Loader2, CalendarX2, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { SkeletonListPage } from '../components/ui/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';

export const RegistrationsPage: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerItem');

  const loadRegistrations = async (isInitial = true) => {
    if (isInitial && regs.length === 0) setLoading(true);
    setError(null);
    try {
      const data = await api.getRegistrations();
      if (Array.isArray(data)) setRegs(data);
    } catch {
      if (regs.length === 0) setError('Could not load registrations. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations(true);
  }, []);

  const handleCancel = async (id: string) => {
    const confirmed = await confirm({
      title: 'Cancel this registration?',
      description: 'You will lose your place for this event. You can register again while places remain.',
      confirmLabel: 'Cancel registration',
      tone: 'danger',
    });
    if (!confirmed) return;
    setCancellingId(id);
    // Optimistic status update
    setRegs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r))
    );
    try {
      await api.cancelRegistration(id);
      showToast('Registration cancelled.');
      loadRegistrations(false);
    } catch {
      showToast('Failed to cancel registration.', 'error');
      loadRegistrations(false);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : 'To be announced');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
      case 'CONFIRMED':
        return { className: 'badge badge-approved', label: 'Registered' };
      case 'CANCELLED':
        return { className: 'badge badge-draft', label: 'Cancelled' };
      default:
        return { className: 'badge badge-pending', label: status };
    }
  };

  if (loading) {
    return <SkeletonListPage label="Loading registrations" rows={4} />;
  }

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-black text-ink font-heading">My Event Registrations</h1>
          <p className="text-body-sm text-ink-muted">
            Track confirmed registrations, upcoming competition dates, and participation status
          </p>
        </div>
        <Link
          to="/events"
          className="btn btn-primary inline-flex items-center gap-1.5 shrink-0"
        >
          <span>Explore Events</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-lg text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadRegistrations(true)} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {regs.length === 0 ? (
        <div className="surface text-center py-20" role="status">
          <CalendarX2 className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-body-md font-bold text-ink font-heading">No event registrations found</h3>
          <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto mb-4">
            You haven't signed up for any upcoming hackathons, guest lectures, or workshops yet.
          </p>
          <Link
            to="/events"
            className="btn btn-primary inline-flex items-center gap-1.5"
          >
            <span>Browse Upcoming Events</span>
          </Link>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" role="table">
              <thead>
                <tr className="bg-surface-sunken border-b border-edge text-label-sm font-bold text-ink-secondary uppercase tracking-wider">
                  <th className="p-4 sm:px-6" scope="col">Event Title</th>
                  <th className="p-4 sm:px-6" scope="col">Registered Date</th>
                  <th className="p-4 sm:px-6" scope="col">Status</th>
                  <th className="p-4 sm:px-6 text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge text-body-sm">
                {regs.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="p-4 sm:px-6 font-bold text-ink">
                      <Link to={`/events/${r.eventId}`} className="hover:text-ink-brand transition-colors">
                        {r.eventTitle}
                      </Link>
                    </td>
                    <td className="p-4 sm:px-6 text-ink-secondary">
                      {formatDate(r.registeredAt)}
                    </td>
                    <td className="p-4 sm:px-6">
                      <span className={getStatusBadge(r.status).className}>
                        {getStatusBadge(r.status).label}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 text-right">
                      {r.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancellingId === r.id}
                          className="text-label-sm font-bold text-ink-muted hover:text-status-rejected disabled:opacity-50 cursor-pointer inline-flex items-center gap-1 transition-colors"
                          aria-label={`Cancel registration for ${r.eventTitle}`}
                        >
                          {cancellingId === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Cancel Registration</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationsPage;
