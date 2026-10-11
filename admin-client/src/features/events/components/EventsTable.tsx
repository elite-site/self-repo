import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Trash2, ChevronDown } from 'lucide-react';
import { formatDate, formatRegistrationRange } from '@/shared/utils/formatDate';
import { EventItem } from '../types';
import { EventStatusBadge } from './EventStatusBadge';
import { formatEventType } from './EventDetailModal';

export interface EventsTableProps {
  events: EventItem[];
  busyId: string | null;
  menuOpenId: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onEdit: (ev: EventItem) => void;
  onDelete: (ev: EventItem) => void;
  onPreview: (ev: EventItem) => void;
  onArchive: (ev: EventItem) => void;
  onDuplicate: (ev: EventItem) => void;
  onPublish: (ev: EventItem) => void;
  onCloseEvent: (ev: EventItem) => void;
  setMenuOpenId: (id: string | null) => void;
}

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  busyId,
  menuOpenId,
  menuRef,
  onEdit,
  onDelete,
  onPreview,
  onArchive,
  onDuplicate,
  onPublish,
  onCloseEvent,
  setMenuOpenId,
}) => {
  return (
    <div className="surface">
      <div className="overflow-x-auto min-h-[260px]">
        <table className="w-full text-sm" role="grid">
          <thead className="bg-surface-inset border-b border-edge">
            <tr>
              {['Event', 'Type', 'Event Date', 'Registration', 'Registrations', 'Status', 'Actions'].map((h) => (
                <th key={h} scope="col" className="text-left px-4 py-3 text-label-sm font-bold text-ink-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-surface-sunken transition-colors">
                <td className="px-4 py-3 font-semibold text-ink">{ev.name}</td>
                <td className="px-4 py-3 text-label-sm text-ink-muted">{formatEventType(ev.type)}</td>
                <td className="px-4 py-3 text-label-sm text-ink-secondary">{formatDate(ev.eventDate)}</td>
                <td className="px-4 py-3 text-label-sm text-ink-secondary">
                  {formatRegistrationRange(ev.registrationStart, ev.registrationEnd)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/event-registrations?eventId=${ev.id}`}
                    className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-brand hover:underline"
                    aria-label={`View ${ev.registrationCount ?? 0} registrations for ${ev.name}`}
                  >
                    <Users className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                    <span>{ev.registrationCount ?? 0}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <EventStatusBadge status={ev.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5" role="group" aria-label={`Actions for ${ev.name}`}>
                    <button
                      type="button"
                      onClick={() => onEdit(ev)}
                      disabled={busyId === ev.id}
                      className="btn btn-ghost px-2.5 py-1 text-xs font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(ev)}
                      disabled={busyId === ev.id}
                      className="btn btn-ghost px-2.5 py-1 text-xs font-semibold text-status-rejected hover:bg-status-bg-rejected transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title={`Delete ${ev.name}`}
                      aria-label={`Delete ${ev.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                    <div className="relative inline-block text-left" ref={menuOpenId === ev.id ? (menuRef as any) : undefined}>
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === ev.id ? null : ev.id)}
                        className="btn btn-ghost px-2 py-1 text-xs font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                        aria-haspopup="menu"
                        aria-expanded={menuOpenId === ev.id}
                      >
                        <span>More</span>
                        <ChevronDown className="w-3 h-3 text-ink-muted" aria-hidden="true" />
                      </button>
                      {menuOpenId === ev.id && (
                        <div
                          role="menu"
                          className="absolute right-0 mt-1 w-44 bg-surface border border-edge rounded-lg shadow-raised z-raised py-1 text-left animate-scale-in"
                        >
                          {ev.status !== 'OPEN' ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => onPublish(ev)}
                              disabled={busyId === ev.id}
                              className="w-full text-left px-3 py-1.5 text-xs text-status-approved hover:bg-surface-sunken transition-colors cursor-pointer font-semibold"
                            >
                              Publish to Students
                            </button>
                          ) : (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => onCloseEvent(ev)}
                              disabled={busyId === ev.id}
                              className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                            >
                              Close Registration
                            </button>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setMenuOpenId(null); onDuplicate(ev); }}
                            disabled={busyId === ev.id}
                            className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setMenuOpenId(null); onPreview(ev); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setMenuOpenId(null); onArchive(ev); }}
                            disabled={busyId === ev.id || ev.status === 'ARCHIVED'}
                            title={ev.status === 'ARCHIVED' ? 'Already archived' : undefined}
                            className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-sunken transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Archive
                          </button>
                          <div className="my-1 border-t border-edge" role="separator" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setMenuOpenId(null); onDelete(ev); }}
                            disabled={busyId === ev.id}
                            className="w-full text-left px-3 py-1.5 text-xs text-status-rejected hover:bg-status-bg-rejected transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
