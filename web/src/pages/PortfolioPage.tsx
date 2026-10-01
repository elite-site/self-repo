import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ProjectsTab } from './portfolio/ProjectsTab';
import { AchievementsTab } from './portfolio/AchievementsTab';
import { CertificatesTab } from './portfolio/CertificatesTab';

export const PortfolioPage: React.FC = () => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'achievements' | 'certificates'>('projects');

  const tabs = [
    { id: 'projects', label: 'Projects', href: '/portfolio/projects' },
    { id: 'achievements', label: 'Achievements', href: '/portfolio/achievements' },
    { id: 'certificates', label: 'Certificates', href: '/portfolio/certificates' },
  ] as const;

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
    const nextTab = tabsRef.current?.querySelectorAll('[role="tab"]')[newIndex] as HTMLElement;
    nextTab?.focus();
    setActiveTab(tabs[newIndex].id);
  };

  return (
    <div className="space-y-6 page-enter" role="main">
      <div>
        <h1 className="text-headline-md font-bold text-ink font-heading">Portfolio</h1>
        <p className="text-body-sm text-ink-secondary mt-0.5">
          Curate technical projects, verified achievements, and industry certifications
        </p>
      </div>

      <div className="surface flex flex-col overflow-hidden">
        <div
          className="border-b border-edge px-4 flex gap-1 bg-surface-sunken"
          role="tablist"
          aria-label="Portfolio sections"
          ref={tabsRef}
        >
          {tabs.map((tab, index) => (
            <NavLink
              key={tab.id}
              to={tab.href}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onClick={() => setActiveTab(tab.id)}
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-primary' : 'btn-ghost'} py-3 px-4 text-xs font-semibold`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div className="p-6">
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
      </div>
    </div>
  );
};

export default PortfolioPage;
