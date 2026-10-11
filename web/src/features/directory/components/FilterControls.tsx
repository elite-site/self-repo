import React from 'react';
import { Chip } from '@/shared/ui/Chip';
import { StatusFilter, SkillItem } from '../types';

export const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'GRADUATED', label: 'Alumni' },
] as const;

interface FilterControlsProps {
  idPrefix: string;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  sectionFilter: string;
  setSectionFilter: (value: string) => void;
  skillFilter: string;
  setSkillFilter: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  availableSkills: SkillItem[];
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  idPrefix,
  yearFilter,
  setYearFilter,
  sectionFilter,
  setSectionFilter,
  skillFilter,
  setSkillFilter,
  statusFilter,
  setStatusFilter,
  availableSkills,
}) => (
  <>
    <div>
      <span className="label">Status</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Student status">
        {STATUS_FILTERS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={statusFilter === option.value}
            onClick={() => setStatusFilter(option.value)}
          />
        ))}
      </div>
    </div>

    <div>
      <label htmlFor={`${idPrefix}-year`} className="label">
        Year of study
      </label>
      <select
        id={`${idPrefix}-year`}
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
        className="select min-h-[44px]"
      >
        <option value="ALL">All academic years</option>
        <option value="1">1st Year</option>
        <option value="2">2nd Year</option>
        <option value="3">3rd Year</option>
        <option value="4">4th Year</option>
      </select>
    </div>

    <div>
      <label htmlFor={`${idPrefix}-section`} className="label">
        Section
      </label>
      <select
        id={`${idPrefix}-section`}
        value={sectionFilter}
        onChange={(e) => setSectionFilter(e.target.value)}
        className="select min-h-[44px]"
      >
        <option value="ALL">All sections</option>
        <option value="A">Section A</option>
        <option value="B">Section B</option>
        <option value="C">Section C</option>
      </select>
    </div>

    <div>
      <label htmlFor={`${idPrefix}-skill`} className="label">
        Skill
      </label>
      <select
        id={`${idPrefix}-skill`}
        value={skillFilter}
        onChange={(e) => setSkillFilter(e.target.value)}
        className="select min-h-[44px]"
      >
        <option value="">All technical skills</option>
        {availableSkills.map((sk) => (
          <option key={sk.id} value={sk.name}>
            {sk.name}
          </option>
        ))}
      </select>
    </div>
  </>
);
