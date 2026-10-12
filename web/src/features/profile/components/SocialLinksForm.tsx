import React from 'react';
import { Github, Linkedin, Globe } from 'lucide-react';
import { LeetCodeIcon, CodeChefIcon, HackerRankIcon, CodeforcesIcon } from '@/shared/ui/PlatformIcons';

interface SocialLinksFormProps {
  githubUrl: string;
  linkedinUrl: string;
  leetcodeUrl: string;
  codechefUrl: string;
  hackerrankUrl: string;
  codeforcesUrl: string;
  portfolioUrl: string;
  onGithubChange: (val: string) => void;
  onLinkedinChange: (val: string) => void;
  onLeetcodeChange: (val: string) => void;
  onCodechefChange: (val: string) => void;
  onHackerrankChange: (val: string) => void;
  onCodeforcesChange: (val: string) => void;
  onPortfolioChange: (val: string) => void;
}

export const SocialLinksForm: React.FC<SocialLinksFormProps> = ({
  githubUrl,
  linkedinUrl,
  leetcodeUrl,
  codechefUrl,
  hackerrankUrl,
  codeforcesUrl,
  portfolioUrl,
  onGithubChange,
  onLinkedinChange,
  onLeetcodeChange,
  onCodechefChange,
  onHackerrankChange,
  onCodeforcesChange,
  onPortfolioChange,
}) => {
  return (
    <div className="surface p-6 sm:p-8 space-y-4">
      <h2 className="font-heading text-body-md font-bold text-ink">Online & Coding Profiles</h2>
      <p className="text-body-sm text-ink-secondary">
        Add links to your public accounts so recruiters can verify your activity and projects.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label htmlFor="github-url-input" className="label inline-flex items-center gap-1.5">
            <Github className="w-4 h-4" /> GitHub
          </label>
          <input
            id="github-url-input"
            type="url"
            value={githubUrl}
            onChange={(e) => onGithubChange(e.target.value)}
            placeholder="https://github.com/username"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="linkedin-url-input" className="label inline-flex items-center gap-1.5">
            <Linkedin className="w-4 h-4 text-brand" /> LinkedIn
          </label>
          <input
            id="linkedin-url-input"
            type="url"
            value={linkedinUrl}
            onChange={(e) => onLinkedinChange(e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="leetcode-url-input" className="label inline-flex items-center gap-1.5">
            <LeetCodeIcon className="w-4 h-4" /> LeetCode
          </label>
          <input
            id="leetcode-url-input"
            type="url"
            value={leetcodeUrl}
            onChange={(e) => onLeetcodeChange(e.target.value)}
            placeholder="https://leetcode.com/username"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="codechef-url-input" className="label inline-flex items-center gap-1.5">
            <CodeChefIcon className="w-4 h-4" /> CodeChef
          </label>
          <input
            id="codechef-url-input"
            type="url"
            value={codechefUrl}
            onChange={(e) => onCodechefChange(e.target.value)}
            placeholder="https://codechef.com/users/username"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="hackerrank-url-input" className="label inline-flex items-center gap-1.5">
            <HackerRankIcon className="w-4 h-4" /> HackerRank
          </label>
          <input
            id="hackerrank-url-input"
            type="url"
            value={hackerrankUrl}
            onChange={(e) => onHackerrankChange(e.target.value)}
            placeholder="https://hackerrank.com"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="codeforces-url-input" className="label inline-flex items-center gap-1.5">
            <CodeforcesIcon className="w-4 h-4" /> Codeforces
          </label>
          <input
            id="codeforces-url-input"
            type="url"
            value={codeforcesUrl}
            onChange={(e) => onCodeforcesChange(e.target.value)}
            placeholder="https://codeforces.com"
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="portfolio-url-input" className="label inline-flex items-center gap-1.5">
            <Globe className="w-4 h-4" /> Personal Portfolio / Website
          </label>
          <input
            id="portfolio-url-input"
            type="url"
            value={portfolioUrl}
            onChange={(e) => onPortfolioChange(e.target.value)}
            placeholder="https://yourname.dev"
            className="input"
          />
        </div>
      </div>
    </div>
  );
};
