import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarX2, AlertCircle, CalendarCheck2, ArrowRight } from 'lucide-react';
import { SkeletonListPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { useRegistrations } from '../hooks/useRegistrations';
import { RegistrationCard } from '../components';

export const RegistrationsPage: React.FC = () => {
  const { regs, loading, cancellingId, error, loadRegistrations, handleCancel } = useRegistrations();

  if (loading) {
    return <SkeletonListPage label="Loading registrations" rows={4} />;
  }

  return (
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-12" role="main">
      {/* 1. ASYMMETRICAL REGISTRATIONS SUMMARY */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div>
            <span className="badge badge-brand text-xs font-semibold">Events Hub</span>
            <h1 className="mt-2 text-headline-md font-black text-ink font-heading">
              My Event Registrations
            </h1>
            <p className="mt-1 text-body-sm text-ink-muted max-w-xl">
              Track confirmed registrations, upcoming competition dates, and team participation status.
            </p>
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                <CalendarCheck2 size={16} aria-hidden="true" />
                Participation Total
              </span>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Confirmed event registrations are verified by faculty coordinators for certificates and attendance.
              </p>
              <div className="pt-1 text-label-xs font-mono text-ink-secondary">
                Registered: <span className="font-bold text-ink">{regs.length}</span> events
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
              <Link to="/events" className="btn btn-primary text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1">
                <span>Browse All Events</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-2xl text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadRegistrations(true)} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 2. MASONRY REGISTRATIONS GRID */}
      {regs.length === 0 ? (
        <div className="surface text-center py-20 px-4 rounded-2xl border border-edge" role="status">
          <CalendarX2 className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-body-md font-bold text-ink font-heading">No active registrations</h3>
          <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto mb-4">
            You haven't registered for any department events, hackathons, or workshops yet.
          </p>
          <Link to="/events" className="btn btn-primary inline-flex items-center gap-1.5 min-h-[44px] px-5">
            Explore Events
          </Link>
        </div>
      ) : (
        <MasonryGrid cols={3}>
          {regs.map((r) => (
            <MasonryItem key={r.id}>
              <RegistrationCard
                registration={r}
                cancelling={cancellingId === r.id}
                onCancel={handleCancel}
              />
            </MasonryItem>
          ))}
        </MasonryGrid>
      )}
    </div>
  );
};

export default RegistrationsPage;
