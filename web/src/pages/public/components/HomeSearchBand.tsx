import React from 'react';
import { Search } from 'lucide-react';

interface HomeSearchBandProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
}

export const HomeSearchBand: React.FC<HomeSearchBandProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
}) => {
  return (
    <section aria-labelledby="directory-search-title" className="border-b border-edge">
      <div className="mx-auto max-w-canvas px-6 py-14 sm:px-10 sm:py-16">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-5">
            <h2
              id="directory-search-title"
              className="font-heading text-headline-lg-mobile font-extrabold tracking-tight text-ink sm:text-headline-lg"
            >
              Search the student directory
            </h2>
            <p className="mt-3 max-w-[48ch] text-body-md text-ink-secondary">
              Find students by name, roll number, or skill and open their verified profile,
              portfolio, and resume.
            </p>
          </div>

          <form onSubmit={onSearch} className="min-w-0 lg:col-span-7">
            <label htmlFor="directory-search" className="label">
              Search students
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={16}
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-3.5 top-3 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  id="directory-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, roll number, or skill"
                  className="input pl-10 min-h-[44px]"
                />
              </div>
              <button type="submit" className="btn btn-primary min-h-[44px] shrink-0">
                <span>Search</span>
              </button>
            </div>
            <p className="hint">Leave the field empty to browse all students.</p>
          </form>
        </div>
      </div>
    </section>
  );
};
