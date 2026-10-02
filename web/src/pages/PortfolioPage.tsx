import React, { useRef } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ProjectsTab } from './portfolio/ProjectsTab';
import { AchievementsTab } from './portfolio/AchievementsTab';
import { CertificatesTab } from './portfolio/CertificatesTab';

const tabs = [
  { id: 'projects', label: 'Projects', href: '/portfolio/projects' },
  { id: 'achievements', label: 'Achievements', href: '/portfolio/achievements' },
  { id: 'certificates', label: 'Certificates', href: '/portfolio/certificates' },
] as const;

export const PortfolioPage: React.FC = () => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Derived from the URL rather than held in state. Opening
  // /portfolio/achievements directly, or pressing Back, used to leave
  // "Projects" marked as the selected tab while the panel below it showed
  // achievements.
  const activeTab = tabs.find((tab) => location.pathname.startsWith(tab.href))?.id ?? 'projects';

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;
    if (e.key === 'ArrowRight') {
      newIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[newIndex]?.focus();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg">Portfolio</h1>
        <p className="mt-1 text-body-md text-ink-secondary">
          Showcase your projects, achievements and certificates.
        </p>
      </header>

      {/* A tab list, not three buttons: the underline rail is the whole control
          and the panel below is not wrapped in a card, so a project row does not
          end up as a card inside a card. */}
      <div
        ref={tabsRef}
        role="tablist"
        aria-label="Portfolio sections"
        className="flex gap-6 overflow-x-auto border-b border-edge"
      >
        {tabs.map((tab, index) => (
          <NavLink
            key={tab.id}
            to={tab.href}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={({ isActive }) =>
              `-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 pt-1 text-label-lg transition-colors duration-fast ${
                isActive
                  ? 'border-brand font-semibold text-ink'
                  : 'border-transparent text-ink-secondary hover:border-edge-strong hover:text-ink'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="projects" replace />} />
        <Route
          path="projects"
          element={
            <div role="tabpanel" id="panel-projects" aria-labelledby="tab-projects">
              <ProjectsTab />
            </div>
          }
        />
        <Route
          path="achievements"
          element={
            <div role="tabpanel" id="panel-achievements" aria-labelledby="tab-achievements">
              <AchievementsTab />
            </div>
          }
        />
        <Route
          path="certificates"
          element={
            <div role="tabpanel" id="panel-certificates" aria-labelledby="tab-certificates">
              <CertificatesTab />
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default PortfolioPage;
