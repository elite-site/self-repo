import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ProjectsTab } from './portfolio/ProjectsTab';
import { AchievementsTab } from './portfolio/AchievementsTab';
import { CertificatesTab } from './portfolio/CertificatesTab';

export const PortfolioPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B192C]">Portfolio</h1>
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
        <div className="border-b border-[#E2E8F0] px-4 flex gap-4 bg-slate-50">
          <NavLink to="projects" className={({isActive}) => `py-3 px-3 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-elite-red text-elite-red bg-white' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>Projects</NavLink>
          <NavLink to="achievements" className={({isActive}) => `py-3 px-3 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-elite-red text-elite-red bg-white' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>Achievements</NavLink>
          <NavLink to="certificates" className={({isActive}) => `py-3 px-3 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-elite-red text-elite-red bg-white' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>Certificates</NavLink>
        </div>
        <div className="p-6">
          <Routes>
            <Route path="/" element={<Navigate to="projects" replace />} />
            <Route path="projects" element={<ProjectsTab />} />
            <Route path="achievements" element={<AchievementsTab />} />
            <Route path="certificates" element={<CertificatesTab />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};
