import React, { useRef } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, Link } from 'react-router-dom';
import { FolderGit2, Award, FileBadge, Sparkles, ExternalLink } from 'lucide-react';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { ProjectsTab, AchievementsTab, CertificatesTab } from '../components';

const tabs = [
  { id: 'projects', label: 'Projects', href: '/portfolio/projects', icon: FolderGit2 },
  { id: 'achievements', label: 'Achievements', href: '/portfolio/achievements', icon: Award },
  { id: 'certificates', label: 'Certificates', href: '/portfolio/certificates', icon: FileBadge },
] as const;

export const PortfolioPage: React.FC = () => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const activeTab = tabs.find((tab) => location.pathname.startsWith(tab.href))?.id ?? 'projects';

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex: number;
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
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-10">
      {/* 1. ASYMMETRICAL PORTFOLIO SUMMARY HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <header className="space-y-3">
            <span className="badge badge-brand text-xs font-semibold">Engineering Excellence</span>
            <h1 className="font-heading text-headline-xl-mobile font-bold text-ink sm:text-headline-xl">
              Student Portfolio
            </h1>
            <p className="text-body-md text-ink-secondary max-w-2xl">
              Curate and showcase your top GitHub open-source repositories, verified certifications, and honors for recruiter review.
            </p>
          </header>

          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Portfolio sections"
            className="flex gap-3 overflow-x-auto pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <NavLink
                  key={tab.id}
                  to={tab.href}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-quick shrink-0 min-h-[44px] ${
                    isActive
                      ? 'bg-brand text-on-primary shadow-sm'
                      : 'bg-surface border border-edge text-ink-secondary hover:text-ink hover:border-brand-ring hover:bg-surface-sunken'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                <Sparkles size={14} aria-hidden="true" />
                Recruiter Showcase
              </span>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Featured portfolio items appear directly on your public student profile and placement resume.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
              <Link
                to="/profile"
                className="text-label-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                <span>View My Profile</span>
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. TAB PANELS */}
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
