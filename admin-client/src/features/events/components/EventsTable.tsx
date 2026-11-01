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
    <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs">
      <div className="table-responsive min-h-[260px] overflow-x-auto">
        <table className="w-full text-sm border-collapse" role="grid">
          <thead className="bg-surface-sunken border-b border-edge">
            <tr>
              {['Event', 'Type', 'Event Date', 'Registration', 'Registrations', 'Status', 'Actions'].map((h) => (
                <th key={h} scope="col" className="text-left px-4 py-3.5 text-xs font-bold text-ink-muted uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-brand-soft/40 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-ink">
                  <div className="text-sm font-semibold">{ev.name}</div>
                  {ev.tagline && <span className="text-xs text-ink-muted">{ev.tagline}</span>}
                </td>
                <td className="px-4 py-3.5 text-xs text-ink-muted">{formatEventType(ev.type)}</td>
                <td className="px-4 py-3.5 text-xs text-ink-secondary whitespace-nowrap">{formatDate(ev.eventDate)}</td>
                <td className="px-4 py-3.5 text-xs text-ink-secondary whitespace-nowrap">
                  {formatRegistrationRange(ev.registrationStart, ev.registrationEnd)}
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    to={`/admin/event-registrations?eventId=${ev.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{ev.registrationCount ?? 0}</span>
                  </Link>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <EventStatusBadge status={ev.status} />
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                  <div className="relative inline-block text-left" ref={menuOpenId === ev.id ? (menuRef as any) : undefined}>
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === ev.id ? null : ev.id)}
                      disabled={busyId === ev.id}
                      className="btn btn-secondary text-xs py-1.5 px-3 min-h-[34px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      aria-haspopup="true"
                      aria-expanded={menuOpenId === ev.id}
                    >
                      <span>Actions</span>
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>

                    {menuOpenId === ev.id && (
                      <div
                        className="absolute right-0 mt-1 w-44 rounded-xl surface shadow-modal border border-edge py-1 z-dropdown text-xs animate-fade-in"
                        role="menu"
                      >
                        <button
                          type="button"
                          onClick={() => { setMenuOpenId(null); onPreview(ev); }}
                          className="w-full text-left px-3 py-2 text-ink hover:bg-surface-sunken cursor-pointer font-medium"
                          role="menuitem"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMenuOpenId(null); onEdit(ev); }}
                          className="w-full text-left px-3 py-2 text-ink hover:bg-surface-sunken cursor-pointer font-medium"
                          role="menuitem"
                        >
                          Edit Configuration
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMenuOpenId(null); onDuplicate(ev); }}
                          className="w-full text-left px-3 py-2 text-ink hover:bg-surface-sunken cursor-pointer font-medium"
                          role="menuitem"
                        >
                          Duplicate Event
                        </button>
                        {ev.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => { setMenuOpenId(null); onPublish(ev); }}
                            className="w-full text-left px-3 py-2 text-status-approved hover:bg-surface-sunken cursor-pointer font-medium"
                            role="menuitem"
                          >
                            Publish Event
                          </button>
                        )}
                        {ev.status === 'PUBLISHED' && (
                          <button
                            type="button"
                            onClick={() => { setMenuOpenId(null); onCloseEvent(ev); }}
                            className="w-full text-left px-3 py-2 text-status-pending hover:bg-surface-sunken cursor-pointer font-medium"
                            role="menuitem"
                          >
                            Close Registrations
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setMenuOpenId(null); onArchive(ev); }}
                          className="w-full text-left px-3 py-2 text-ink-muted hover:bg-surface-sunken cursor-pointer font-medium"
                          role="menuitem"
                        >
                          Archive Event
                        </button>
                        <div className="border-t border-edge my-1" />
                        <button
                          type="button"
                          onClick={() => { setMenuOpenId(null); onDelete(ev); }}
                          className="w-full text-left px-3 py-2 text-status-rejected hover:bg-surface-sunken cursor-pointer font-medium flex items-center gap-1.5"
                          role="menuitem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Event</span>
                        </button>
                      </div>
                    )}
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

export default EventsTable;
