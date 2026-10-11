import React from 'react';
import { X, Users, CheckCircle2, UserCheck, XCircle, Trash2 } from 'lucide-react';
import { RegistrationItem, RegistrationStatus } from '../types';
import { RegistrationStatusBadge, TeamStatusBadge } from './RegistrationStatusBadge';

export interface RegistrationDetailModalProps {
  registration: RegistrationItem | null;
  statusNote: string;
  statusUpdateLoading: boolean;
  onClose: () => void;
  onStatusNoteChange: (note: string) => void;
  onUpdateStatus: (id: string, status: RegistrationStatus) => void;
  onDeleteRegistration: (id: string) => void;
}

export const RegistrationDetailModal: React.FC<RegistrationDetailModalProps> = ({
  registration,
  statusNote,
  statusUpdateLoading,
  onClose,
  onStatusNoteChange,
  onUpdateStatus,
  onDeleteRegistration,
}) => {
  if (!registration) return null;

  return (
    <div className="fixed inset-0 z-50 bg-scrim flex justify-end">
      <div className="w-full max-w-lg bg-surface text-ink h-full shadow-2xl flex flex-col overflow-hidden animate-fade-in slide-in-from-right duration-base">
        {/* Drawer Header */}
        <div className="p-5 border-b border-edge flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Registration Details</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              ID: <span className="font-mono">{registration.id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Student Summary */}
          <div className="bg-surface-canvas p-4 rounded-xl border border-edge space-y-3">
            <div className="text-xs font-bold text-ink-muted">Student Information</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-status-bg-rejected text-status-rejected font-semibold flex items-center justify-center text-sm shrink-0">
                {registration.student.name?.[0] || 'S'}
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">{registration.student.name}</h3>
                <div className="text-xs text-ink-muted font-mono">{registration.student.rollNo}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-edge/60">
              <div>
                <span className="text-ink-muted">Email:</span>
                <div className="font-semibold text-ink truncate">{registration.student.email || 'N/A'}</div>
              </div>
              <div>
                <span className="text-ink-muted">Class:</span>
                <div className="font-semibold text-ink">
                  Year {registration.student.year} · Sec {registration.student.section} ({registration.student.branch})
                </div>
              </div>
            </div>
          </div>

          {/* Event & Registration Metadata */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-ink-muted">Event & Status</div>
            <div className="p-3 rounded-xl border border-edge space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Event:</span>
                <span className="font-bold text-ink">{registration.event.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Current Status:</span>
                <RegistrationStatusBadge status={registration.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Registered On:</span>
                <span className="font-semibold text-ink-secondary">
                  {new Date(registration.registeredAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Team Information */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-ink-muted">Team Details</div>
            {registration.team ? (
              <div className="p-3 rounded-xl border border-edge bg-status-bg-review/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-status-review" />
                    <span className="font-semibold text-ink text-sm">{registration.team.name}</span>
                  </div>
                  <TeamStatusBadge status={registration.team.status} />
                </div>

                {registration.team.leader && (
                  <div className="text-xs text-ink-secondary">
                    <span className="text-ink-muted">Leader:</span>{' '}
                    <span className="font-bold">{registration.team.leader.name}</span> (
                    <span className="font-mono">{registration.team.leader.rollNo}</span>)
                  </div>
                )}

                {registration.team.members && (
                  <div>
                    <span className="text-xs font-semibold text-ink-muted block mb-1">Team Members:</span>
                    <div className="space-y-1">
                      {registration.team.members.map((m) => (
                        <div
                          key={m.id}
                          className="text-xs flex items-center justify-between bg-surface p-1.5 rounded-lg border border-edge"
                        >
                          <span>{m.student.name}</span>
                          <span className="font-mono text-ink-muted">{m.student.rollNo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-edge text-xs text-ink-muted">
                Individual participant (Solo registration)
              </div>
            )}
          </div>

          {/* Custom Questionnaire Answers */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-ink-muted">Custom Registration Form Answers</div>
            {registration.answers && registration.answers.length > 0 ? (
              <div className="space-y-2">
                {registration.answers.map((ans) => (
                  <div
                    key={ans.id}
                    className="p-3 rounded-xl bg-surface-sunken border border-edge space-y-1 text-xs"
                  >
                    <div className="font-bold text-ink">{ans.field?.label || 'Question'}</div>
                    <div className="text-ink-secondary whitespace-pre-wrap font-medium">
                      {ans.value || <span className="italic text-ink-muted">No response provided</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-edge text-xs text-ink-muted text-center">
                No custom questionnaire fields submitted for this event.
              </div>
            )}
          </div>

          {/* Status Action Controls */}
          <div className="space-y-3 pt-3 border-t border-edge">
            <div className="text-xs font-bold text-ink-muted">Manage Status</div>

            <textarea
              value={statusNote}
              onChange={(e) => onStatusNoteChange(e.target.value)}
              placeholder="Optional audit log note / reason for status change…"
              rows={2}
              className="w-full text-xs p-2.5 bg-surface-sunken border border-edge rounded-xl focus:outline-none focus:border-status-rejected resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={statusUpdateLoading || registration.status === 'CONFIRMED'}
                onClick={() => onUpdateStatus(registration.id, 'CONFIRMED')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-status-solid-approved hover:opacity-90 text-on-primary rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
              </button>

              <button
                disabled={statusUpdateLoading || registration.status === 'WAITLISTED'}
                onClick={() => onUpdateStatus(registration.id, 'WAITLISTED')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-status-solid-approved hover:opacity-90 text-on-primary rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" /> Waitlist
              </button>

              <button
                disabled={statusUpdateLoading || registration.status === 'CANCELLED'}
                onClick={() => onUpdateStatus(registration.id, 'CANCELLED')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-inverse text-ink-inverse hover:opacity-90 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>

              <button
                disabled={statusUpdateLoading || registration.status === 'REJECTED'}
                onClick={() => onUpdateStatus(registration.id, 'REJECTED')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-status-solid-rejected hover:opacity-90 text-on-primary rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-edge">
            <button
              onClick={() => onDeleteRegistration(registration.id)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-status-rejected hover:bg-status-bg-rejected rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Registration Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
