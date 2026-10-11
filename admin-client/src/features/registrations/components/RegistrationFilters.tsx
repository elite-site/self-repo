import React from 'react';
import { Search } from 'lucide-react';
import { EventItem } from '@/features/events/types';

export interface RegistrationFiltersProps {
  events: EventItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedYear: string;
  setSelectedYear: (yr: string) => void;
  selectedSection: string;
  setSelectedSection: (sec: string) => void;
  selectedTeamFilter: 'all' | 'team' | 'solo';
  setSelectedTeamFilter: (filter: 'all' | 'team' | 'solo') => void;
  setPage: (page: number) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const RegistrationFilters: React.FC<RegistrationFiltersProps> = ({
  events,
  searchQuery,
  setSearchQuery,
  selectedEventId,
  setSelectedEventId,
  selectedStatus,
  setSelectedStatus,
  selectedYear,
  setSelectedYear,
  selectedSection,
  setSelectedSection,
  selectedTeamFilter,
  setSelectedTeamFilter,
  setPage,
  hasActiveFilters,
  onResetFilters,
  onSearchSubmit,
}) => {
  return (
    <div className="bg-surface p-4 rounded-lg border border-edge space-y-3 shadow-xs">
      <form onSubmit={onSearchSubmit} className="flex flex-col md:flex-row gap-3">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, email, or team name…"
            className="w-full pl-10 pr-4 py-2 text-xs bg-surface-sunken border border-edge rounded-xl focus:outline-none focus:border-status-rejected"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected cursor-pointer"
          >
            <option value="all">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.year})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending Review</option>
            <option value="WAITLISTED">Waitlisted</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected cursor-pointer"
          >
            <option value="ALL">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>

          {/* Section Filter */}
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected cursor-pointer"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>

          {/* Team/Solo Filter */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => {
              setSelectedTeamFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected cursor-pointer"
          >
            <option value="all">Team & Solo</option>
            <option value="team">In Team</option>
            <option value="solo">Solo Only</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-2 text-xs font-bold text-status-rejected hover:bg-status-bg-rejected rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
