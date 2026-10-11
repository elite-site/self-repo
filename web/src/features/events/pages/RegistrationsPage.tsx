import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarX2, AlertCircle } from 'lucide-react';
import { SkeletonListPage } from '@/shared/ui/Skeleton';
import { useRegistrations } from '../hooks/useRegistrations';
import { RegistrationCard } from '../components';

export const RegistrationsPage: React.FC = () => {
  const { regs, loading, cancellingId, error, loadRegistrations, handleCancel } = useRegistrations();

  if (loading) {
    return <SkeletonListPage label="Loading registrations" rows={4} />;
  }

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-black text-ink font-heading">My event registrations</h1>
          <p className="text-body-sm text-ink-muted">
            Track confirmed registrations, upcoming competition dates, and participation status
          </p>
        </div>
        <Link to="/events" className="btn btn-primary self-start sm:self-auto">
          Browse Events
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
        <div className="surface text-center py-20 px-4" role="status">
          <CalendarX2 className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-body-md font-bold text-ink font-heading">No active registrations</h3>
          <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto mb-4">
            You haven't registered for any department events, hackathons, or workshops yet.
          </p>
          <Link to="/events" className="btn btn-primary inline-flex items-center gap-1.5">
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="list" aria-label="Registrations">
          {regs.map((r) => (
            <RegistrationCard
              key={r.id}
              registration={r}
              cancelling={cancellingId === r.id}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrationsPage;
