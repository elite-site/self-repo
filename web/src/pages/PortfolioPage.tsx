import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ProjectsTab } from './portfolio/ProjectsTab';
import { AchievementsTab } from './portfolio/AchievementsTab';
import { CertificatesTab } from './portfolio/CertificatesTab';

export const PortfolioPage: React.FC = () => {
  return (
    <div className="space-y-6 text-[#0F172A]">
      <div>
        <h1 className="text-2xl font-bold font-heading text-[#0F172A]">Portfolio</h1>
        <p className="text-xs text-[#475569] mt-0.5">
          Curate technical projects, verified achievements, and industry certifications
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-[#E4E7F2] overflow-hidden flex flex-col">
        <div className="border-b border-[#E4E7F2] px-4 flex gap-4 bg-[#F7F8FC]">
          <NavLink
            to="projects"
            className={({ isActive }) =>
              `py-3 px-3 border-b-2 font-semibold text-xs transition-colors ${
                isActive
                  ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF2FF]/40'
              }`
            }
          >
            Projects
          </NavLink>
          <NavLink
            to="achievements"
            className={({ isActive }) =>
              `py-3 px-3 border-b-2 font-semibold text-xs transition-colors ${
                isActive
                  ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF2FF]/40'
              }`
            }
          >
            Achievements
          </NavLink>
          <NavLink
            to="certificates"
            className={({ isActive }) =>
              `py-3 px-3 border-b-2 font-semibold text-xs transition-colors ${
                isActive
                  ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF2FF]/40'
              }`
            }
          >
            Certificates
          </NavLink>
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

export default PortfolioPage;
