import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { cn } from '@/shared/lib/cn';

interface CommandItem {
  cmd: string;
  label?: string;
}

interface PointItem {
  title: string;
  desc: string;
  cmd?: string;
}

interface CheatSheetItem {
  cmd: string;
  desc: string;
}

interface WorkflowItem {
  step: number;
  title: string;
  cmd?: string;
  desc: string;
}

interface InstructionStep {
  id: string;
  stepNumber: number;
  title: string;
  navTitle: string;
  description: string;
  explanation?: string;
  commands?: CommandItem[];
  points?: PointItem[];
  cheatSheet?: CheatSheetItem[];
  workflow?: WorkflowItem[];
}

const INSTRUCTION_STEPS: InstructionStep[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    title: 'What is Git and GitHub?',
    navTitle: 'Git vs GitHub',
    description: 'Git tracks changes on your local computer. GitHub stores your code online.',
    explanation:
      'Git is the version control software installed locally on your machine that saves snapshots of your work over time. GitHub is a cloud-based hosting service that lets you backup, share, and collaborate on those Git repositories with others.',
  },
  {
    id: 'step-2',
    stepNumber: 2,
    title: 'Setup: Install Git & Set Your Identity',
    navTitle: 'Setup & Identity',
    description: 'Install Git on your computer, sign up for a GitHub account, and configure your name and email so commits are credited to you.',
    commands: [
      {
        cmd: 'git config --global user.name "Your Name"',
        label: 'Set your display name for commits',
      },
      {
        cmd: 'git config --global user.email "you@example.com"',
        label: 'Set your GitHub account email address',
      },
    ],
  },
  {
    id: 'step-3',
    stepNumber: 3,
    title: 'Create a Repository',
    navTitle: 'Create Repo',
    description: 'Create a repository on GitHub using the "New repository" button, or initialize any local folder on your computer using git init.',
    commands: [
      {
        cmd: 'git init',
        label: 'Turn the current folder into a new Git repository',
      },
    ],
  },
  {
    id: 'step-4',
    stepNumber: 4,
    title: 'Clone: Download a Repository',
    navTitle: 'Clone',
    description: 'Download an existing project repository from GitHub to your computer so you can work on it locally.',
    commands: [
      {
        cmd: 'git clone <repo-url>',
        label: 'Clone remote repository to your local folder',
      },
    ],
  },
  {
    id: 'step-5',
    stepNumber: 5,
    title: 'Check Status',
    navTitle: 'Status',
    description: 'Check which files have been modified, staged for commit, or are currently untracked by Git.',
    commands: [
      {
        cmd: 'git status',
        label: 'Show working tree status',
      },
    ],
  },
  {
    id: 'step-6',
    stepNumber: 6,
    title: 'Stage Changes',
    navTitle: 'Stage Changes',
    description: 'Stage your file modifications so Git knows what to include in your next save point.',
    commands: [
      {
        cmd: 'git add .',
        label: 'Stage all modified, added, and deleted files',
      },
      {
        cmd: 'git add <file>',
        label: 'Stage one specific file (e.g. git add src/App.tsx)',
      },
    ],
  },
  {
    id: 'step-7',
    stepNumber: 7,
    title: 'Commit: Save a Checkpoint',
    navTitle: 'Commit',
    description: 'Record your staged changes permanently into project history with a meaningful message explaining what changed.',
    commands: [
      {
        cmd: 'git commit -m "meaningful message"',
        label: 'Save staged changes with a descriptive message',
      },
    ],
  },
  {
    id: 'step-8',
    stepNumber: 8,
    title: 'Push: Upload to GitHub',
    navTitle: 'Push',
    description: 'Upload your committed local changes to GitHub so your work is backed up and visible online.',
    commands: [
      {
        cmd: 'git push origin main',
        label: 'Upload commits to the main branch on GitHub',
      },
    ],
  },
  {
    id: 'step-9',
    stepNumber: 9,
    title: 'Pull: Download from GitHub',
    navTitle: 'Pull',
    description: 'Fetch and merge the latest changes from GitHub directly into your local project files.',
    commands: [
      {
        cmd: 'git pull origin main',
        label: 'Download latest remote changes and merge them',
      },
    ],
  },
  {
    id: 'step-10',
    stepNumber: 10,
    title: 'Fetch vs Pull',
    navTitle: 'Fetch vs Pull',
    description: 'Fetch downloads remote changes without altering your working code; Pull downloads AND merges them into your files.',
    commands: [
      {
        cmd: 'git fetch origin',
        label: 'Download remote updates without modifying working files',
      },
      {
        cmd: 'git pull origin main',
        label: 'Fetch updates and automatically merge into current branch',
      },
    ],
  },
  {
    id: 'step-11',
    stepNumber: 11,
    title: 'Branches: Work in Isolation',
    navTitle: 'Branches',
    description: 'Branches allow you to work on new features or test experiments safely without affecting the main working codebase.',
    commands: [
      {
        cmd: 'git branch',
        label: 'List all existing local branches',
      },
      {
        cmd: 'git checkout -b <name>',
        label: 'Create and switch to a new branch (classic command)',
      },
      {
        cmd: 'git switch -c <name>',
        label: 'Create and switch to a new branch (modern command)',
      },
      {
        cmd: 'git switch <name>',
        label: 'Switch to an existing branch',
      },
    ],
  },
  {
    id: 'step-12',
    stepNumber: 12,
    title: 'Merge and Pull Requests',
    navTitle: 'Pull Requests',
    description: 'A Pull Request (PR) proposes your branch changes to teammates on GitHub to review and merge into the main branch.',
    points: [
      {
        title: 'Step 1: Push your branch to GitHub',
        desc: 'Send your local branch up to GitHub so it is available online.',
        cmd: 'git push -u origin <branch-name>',
      },
      {
        title: 'Step 2: Open Pull Request on GitHub',
        desc: 'Open your repo on GitHub, click "Compare & pull request", enter a descriptive summary, and submit.',
      },
      {
        title: 'Step 3: Review and Merge',
        desc: 'After review, click "Merge pull request" on GitHub, or merge locally on your command line.',
        cmd: 'git merge <branch-name>',
      },
    ],
  },
  {
    id: 'step-13',
    stepNumber: 13,
    title: '.gitignore: Ignore Unwanted Files',
    navTitle: '.gitignore',
    description: 'A .gitignore file lists files, folders, and secrets that Git should intentionally never track or upload to GitHub.',
    commands: [
      {
        cmd: "node_modules/\n.env\ndist/\n*.log",
        label: 'Common example .gitignore content',
      },
    ],
  },
  {
    id: 'step-14',
    stepNumber: 14,
    title: 'View History',
    navTitle: 'View History',
    description: 'Inspect past commit history to see recent snapshots, authors, and commit messages.',
    commands: [
      {
        cmd: 'git log --oneline',
        label: 'View a compact single-line commit history',
      },
    ],
  },
  {
    id: 'step-15',
    stepNumber: 15,
    title: 'Undo Mistakes Safely',
    navTitle: 'Undo Mistakes',
    description: 'Discard uncommitted file edits or roll back your last commit while keeping your work staged.',
    commands: [
      {
        cmd: 'git restore <file>',
        label: 'Discard uncommitted changes in a specific file',
      },
      {
        cmd: 'git reset --soft HEAD~1',
        label: 'Undo last commit but keep modified files staged',
      },
    ],
  },
  {
    id: 'step-16',
    stepNumber: 16,
    title: 'Common Errors and Fixes',
    navTitle: 'Common Errors',
    description: 'Fast solutions to the three most frequent errors beginners experience:',
    points: [
      {
        title: 'Error: "rejected - non-fast-forward"',
        desc: 'GitHub has newer commits that your local computer does not have yet. Run pull first to sync before pushing.',
        cmd: 'git pull origin main',
      },
      {
        title: 'Error: Merge conflicts',
        desc: 'Both you and another person changed the exact same line. Open the conflicting file in your editor, pick the correct lines, save, stage, and commit.',
        cmd: 'git add <resolved-file>',
      },
      {
        title: 'Error: "Permission denied" / Authentication failed',
        desc: 'GitHub requires a Personal Access Token (PAT) or SSH key instead of your account password. Generate a token in GitHub Settings > Developer Settings > Personal access tokens.',
        cmd: 'git remote set-url origin git@github.com:<username>/<repo>.git',
      },
    ],
  },
  {
    id: 'step-17',
    stepNumber: 17,
    title: 'Quick Cheat Sheet Table',
    navTitle: 'Cheat Sheet',
    description: 'Quick-reference guide of essential Git commands and what each one does:',
    cheatSheet: [
      { cmd: 'git init', desc: 'Initialize a new local Git repository' },
      { cmd: 'git clone <url>', desc: 'Download a remote repository to local computer' },
      { cmd: 'git status', desc: 'Check modified and staged files status' },
      { cmd: 'git add .', desc: 'Stage all modified files for the next commit' },
      { cmd: 'git commit -m "msg"', desc: 'Record staged changes with a descriptive message' },
      { cmd: 'git push origin main', desc: 'Upload local commits to GitHub' },
      { cmd: 'git pull origin main', desc: 'Download and merge latest changes from GitHub' },
      { cmd: 'git branch', desc: 'List all local branches' },
      { cmd: 'git switch -c <name>', desc: 'Create and switch to a new branch' },
      { cmd: 'git switch <name>', desc: 'Switch to an existing branch' },
      { cmd: 'git log --oneline', desc: 'View commit history in one line per commit' },
      { cmd: 'git restore <file>', desc: 'Discard uncommitted changes in a file' },
      { cmd: 'git reset --soft HEAD~1', desc: 'Undo last commit, keep changes staged' },
    ],
  },
  {
    id: 'step-18',
    stepNumber: 18,
    title: 'Daily Workflow Summary',
    navTitle: 'Daily Workflow',
    description: 'Follow this 5-step daily routine every time you work on your project:',
    workflow: [
      { step: 1, title: 'Pull', cmd: 'git pull origin main', desc: 'Start your session by getting the latest code from GitHub' },
      { step: 2, title: 'Make Changes', desc: 'Write, edit, and test your code locally in your editor' },
      { step: 3, title: 'Stage', cmd: 'git add .', desc: 'Stage your modified and new files' },
      { step: 4, title: 'Commit', cmd: 'git commit -m "meaningful message"', desc: 'Save your changes with a clear summary message' },
      { step: 5, title: 'Push', cmd: 'git push origin main', desc: 'Upload your commits to GitHub' },
    ],
  },
];

const CopyButton: React.FC<{ code: string; labelText?: string }> = ({ code, labelText = 'Copy' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-ghost shrink-0 h-7 sm:h-8 px-2.5 text-label-xs font-semibold inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface hover:bg-surface-elevated text-ink-secondary hover:text-ink transition-colors cursor-pointer"
      aria-label={`Copy command: ${code.slice(0, 40)}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={13} className="text-status-approved" />
          <span className="text-status-approved">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={13} />
          <span>{labelText}</span>
        </>
      )}
    </button>
  );
};

const CodeBlock: React.FC<{ code: string; label?: string }> = ({ code, label }) => {
  return (
    <div className="rounded-lg border border-edge bg-surface-sunken p-2.5 sm:p-3 font-mono text-body-sm text-ink flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0 overflow-x-auto">
        {label && (
          <div className="text-label-xs text-ink-muted font-sans mb-1 font-medium">{label}</div>
        )}
        <code className="text-ink text-xs sm:text-sm select-all whitespace-pre block font-mono">
          {code}
        </code>
      </div>
      <CopyButton code={code} />
    </div>
  );
};

export interface GithubInstructionsModalProps {
  open: boolean;
  onClose: () => void;
}

export const GithubInstructionsModal: React.FC<GithubInstructionsModalProps> = ({
  open,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<string>(INSTRUCTION_STEPS[0].id);

  const handleJump = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="GitHub Beginner's Guide"
      description="Simple, step-by-step instructions and essential commands to help you master Git & GitHub."
      size="xl"
      className="max-h-[80vh] h-[80vh] md:max-w-4xl"
    >
      <div className="flex flex-col md:flex-row gap-6 relative">
        {/* Desktop Sticky Sidebar */}
        <aside className="hidden md:block w-48 shrink-0 sticky top-0 self-start max-h-[calc(80vh-8rem)] overflow-y-auto pr-2 border-r border-edge space-y-1 text-label-xs">
          <div className="font-bold text-ink-muted uppercase tracking-wider px-2 py-1 mb-1 text-[10px]">
            Steps & Topics
          </div>
          {INSTRUCTION_STEPS.map((step) => {
            const isActive = activeId === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleJump(step.id)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-lg transition-colors truncate block cursor-pointer',
                  isActive
                    ? 'bg-brand-soft text-brand-soft-text font-bold'
                    : 'text-ink-secondary hover:text-ink hover:bg-surface-sunken',
                )}
                title={`${step.stepNumber}. ${step.title}`}
              >
                <span className="font-mono text-ink-muted mr-1.5">{step.stepNumber}.</span>
                <span>{step.navTitle}</span>
              </button>
            );
          })}
        </aside>

        {/* Mobile Top Tabs (Sticky) */}
        <div className="md:hidden sticky -top-5 -mt-5 -mx-5 px-4 py-2 bg-surface/95 backdrop-blur border-b border-edge z-10 overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none">
          {INSTRUCTION_STEPS.map((step) => {
            const isActive = activeId === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleJump(step.id)}
                className={cn(
                  'shrink-0 px-2.5 py-1 rounded-full text-label-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-brand-soft border-brand/20 text-brand-soft-text'
                    : 'bg-surface-sunken border-edge text-ink-secondary hover:text-ink',
                )}
              >
                {step.stepNumber}. {step.navTitle}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {INSTRUCTION_STEPS.map((step) => (
            <section
              key={step.id}
              id={step.id}
              className="scroll-mt-14 space-y-3.5 p-4 sm:p-5 rounded-xl border border-edge bg-surface shadow-xs"
            >
              <div className="flex items-start gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-text font-bold text-label-xs font-mono">
                  {step.stepNumber}
                </span>
                <div className="space-y-1">
                  <h3 className="font-heading text-label-lg font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="text-body-sm text-ink-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {step.explanation && (
                <div className="p-3 rounded-lg bg-surface-sunken border border-edge text-body-sm text-ink-secondary leading-relaxed">
                  {step.explanation}
                </div>
              )}

              {/* Commands with Copy Buttons */}
              {step.commands && step.commands.length > 0 && (
                <div className="space-y-2 pt-1">
                  {step.commands.map((c, idx) => (
                    <CodeBlock key={idx} code={c.cmd} label={c.label} />
                  ))}
                </div>
              )}

              {/* Step Points (for PRs & Errors) */}
              {step.points && step.points.length > 0 && (
                <div className="space-y-3 pt-1">
                  {step.points.map((point, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-edge bg-surface-sunken space-y-2"
                    >
                      <h4 className="font-heading text-label-sm font-bold text-ink">
                        {point.title}
                      </h4>
                      <p className="text-body-xs text-ink-secondary leading-relaxed">
                        {point.desc}
                      </p>
                      {point.cmd && <CodeBlock code={point.cmd} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Cheat Sheet Table */}
              {step.cheatSheet && (
                <div className="pt-1 overflow-x-auto rounded-lg border border-edge">
                  <table className="w-full text-left text-body-sm">
                    <thead className="bg-surface-sunken border-b border-edge text-label-xs font-semibold text-ink-secondary">
                      <tr>
                        <th className="px-3 py-2">Command</th>
                        <th className="px-3 py-2">What it does</th>
                        <th className="px-3 py-2 text-right">Copy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge">
                      {step.cheatSheet.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-sunken/50 transition-colors">
                          <td className="px-3 py-2 font-mono text-xs text-ink font-semibold whitespace-nowrap">
                            <code>{item.cmd}</code>
                          </td>
                          <td className="px-3 py-2 text-ink-secondary text-xs">
                            {item.desc}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <CopyButton code={item.cmd} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily Workflow */}
              {step.workflow && (
                <div className="space-y-2.5 pt-1">
                  {/* Visual Flow Header */}
                  <div className="p-3 rounded-lg bg-brand-soft border border-brand/20 text-brand-soft-text text-label-xs font-semibold flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <Terminal size={14} />
                      Daily Loop:
                    </span>
                    <span className="font-mono text-xs">
                      pull → make changes → add → commit → push
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {step.workflow.map((item) => (
                      <div
                        key={item.step}
                        className="p-3 rounded-lg border border-edge bg-surface-sunken flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-center justify-between text-label-xs text-ink-muted font-bold mb-1">
                            <span>Step {item.step}</span>
                            <span className="text-ink">{item.title}</span>
                          </div>
                          <p className="text-body-xs text-ink-secondary">
                            {item.desc}
                          </p>
                        </div>
                        {item.cmd && <CodeBlock code={item.cmd} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export interface GithubInstructionsProps {
  className?: string;
}

export const GithubInstructions: React.FC<GithubInstructionsProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          'btn btn-secondary min-h-[42px] px-4 text-label-sm font-semibold inline-flex items-center gap-2 cursor-pointer'
        }
        aria-label="Open GitHub instructions guide"
      >
        <BookOpen size={16} aria-hidden="true" />
        <span>Instructions</span>
      </button>

      <GithubInstructionsModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default GithubInstructions;
