import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GithubSkillsSection } from '../GithubSkillsSection';
import { GithubSkillItem } from '../../types';

describe('GithubSkillsSection Component', () => {
  const mockSkills: GithubSkillItem[] = [
    {
      id: 'gss_1',
      skillId: 'sk_java',
      name: 'Java',
      category: 'Languages',
      repoCount: 4,
      totalBytes: 25000,
      isShowcased: true,
    },
    {
      id: 'gss_2',
      skillId: 'sk_ts',
      name: 'TypeScript',
      category: 'Languages',
      repoCount: 2,
      totalBytes: 15000,
      isShowcased: false,
    },
    {
      id: 'gss_3',
      skillId: 'sk_react',
      name: 'React',
      category: 'Frameworks',
      repoCount: 3,
      totalBytes: 18000,
      isShowcased: true,
    },
  ];

  it('renders empty state when no skills are detected', () => {
    render(
      <GithubSkillsSection
        skills={[]}
        selectedSkillIds={[]}
        editingSkills={false}
        savingSkills={false}
        isSkillsDirty={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSaveSkills={vi.fn()}
        onToggleSkill={vi.fn()}
        onSelectAll={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('No skills detected yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Sync your GitHub account to automatically extract languages/i)
    ).toBeInTheDocument();
  });

  it('renders extracted skills with names, repo counts, and showcased status', () => {
    render(
      <GithubSkillsSection
        skills={mockSkills}
        selectedSkillIds={['sk_java', 'sk_react']}
        editingSkills={false}
        savingSkills={false}
        isSkillsDirty={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSaveSkills={vi.fn()}
        onToggleSkill={vi.fn()}
        onSelectAll={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/Extracted Skills \(2\/3 showcased\)/i)).toBeInTheDocument();
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getByText('4 repos')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('2 repos')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('3 repos')).toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: /edit showcase skills/i });
    expect(editButton).toBeInTheDocument();
  });

  it('calls onStartEdit when Edit Skills button is clicked', () => {
    const handleStartEdit = vi.fn();
    render(
      <GithubSkillsSection
        skills={mockSkills}
        selectedSkillIds={['sk_java']}
        editingSkills={false}
        savingSkills={false}
        isSkillsDirty={false}
        onStartEdit={handleStartEdit}
        onCancelEdit={vi.fn()}
        onSaveSkills={vi.fn()}
        onToggleSkill={vi.fn()}
        onSelectAll={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const editBtn = screen.getByRole('button', { name: /edit showcase skills/i });
    fireEvent.click(editBtn);
    expect(handleStartEdit).toHaveBeenCalledTimes(1);
  });

  it('renders edit mode with toggle buttons, select all, clear all, and save/cancel', () => {
    const handleToggle = vi.fn();
    const handleSelectAll = vi.fn();
    const handleClearAll = vi.fn();
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(
      <GithubSkillsSection
        skills={mockSkills}
        selectedSkillIds={['sk_java']}
        editingSkills={true}
        savingSkills={false}
        isSkillsDirty={true}
        onStartEdit={vi.fn()}
        onCancelEdit={handleCancel}
        onSaveSkills={handleSave}
        onToggleSkill={handleToggle}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
      />
    );

    // Banner instructions
    expect(
      screen.getByText(/Click on any skill to toggle whether it is showcased on your profile/i)
    ).toBeInTheDocument();

    // Select All and Clear All
    const selectAllBtn = screen.getByText(/Select All/i);
    const clearAllBtn = screen.getByText(/Clear All/i);
    fireEvent.click(selectAllBtn);
    expect(handleSelectAll).toHaveBeenCalledTimes(1);
    fireEvent.click(clearAllBtn);
    expect(handleClearAll).toHaveBeenCalledTimes(1);

    // Toggling a skill (e.g. Java)
    const javaSkillBtn = screen.getByRole('checkbox', { name: /java/i });
    expect(javaSkillBtn).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(javaSkillBtn);
    expect(handleToggle).toHaveBeenCalledWith('sk_java');

    // Save and Cancel buttons
    const saveBtn = screen.getByRole('button', { name: /save showcase skills/i });
    const cancelBtn = screen.getByRole('button', { name: /cancel editing showcase skills/i });
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledTimes(1);
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
