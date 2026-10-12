import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SocialLinksForm } from '../SocialLinksForm';

describe('SocialLinksForm', () => {
  const defaultProps = {
    githubUrl: 'https://github.com/alice',
    linkedinUrl: 'https://linkedin.com/in/alice',
    leetcodeUrl: 'https://leetcode.com/alice',
    codechefUrl: 'https://codechef.com/users/alice',
    hackerrankUrl: '',
    codeforcesUrl: '',
    portfolioUrl: 'https://alice.dev',
    onGithubChange: vi.fn(),
    onLinkedinChange: vi.fn(),
    onLeetcodeChange: vi.fn(),
    onCodechefChange: vi.fn(),
    onHackerrankChange: vi.fn(),
    onCodeforcesChange: vi.fn(),
    onPortfolioChange: vi.fn(),
  };

  it('renders section title and description', () => {
    render(<SocialLinksForm {...defaultProps} />);
    expect(screen.getByText('Online & Coding Profiles')).toBeInTheDocument();
    expect(screen.getByText(/Add links to your public accounts/i)).toBeInTheDocument();
  });

  it('renders HackerRank input with icon, correct placeholder, class, and value', () => {
    const onHackerrankChange = vi.fn();
    render(
      <SocialLinksForm
        {...defaultProps}
        hackerrankUrl="https://hackerrank.com/alice"
        onHackerrankChange={onHackerrankChange}
      />
    );

    const label = screen.getByText('HackerRank');
    expect(label).toBeInTheDocument();
    expect(label.closest('label')).toHaveAttribute('for', 'hackerrank-url-input');

    const input = screen.getByPlaceholderText('https://hackerrank.com');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'hackerrank-url-input');
    expect(input).toHaveClass('input');
    expect(input).toHaveValue('https://hackerrank.com/alice');

    fireEvent.change(input, { target: { value: 'https://hackerrank.com/newalice' } });
    expect(onHackerrankChange).toHaveBeenCalledWith('https://hackerrank.com/newalice');
  });

  it('renders Codeforces input with icon, correct placeholder, class, and value', () => {
    const onCodeforcesChange = vi.fn();
    render(
      <SocialLinksForm
        {...defaultProps}
        codeforcesUrl="https://codeforces.com/profile/alice"
        onCodeforcesChange={onCodeforcesChange}
      />
    );

    const label = screen.getByText('Codeforces');
    expect(label).toBeInTheDocument();
    expect(label.closest('label')).toHaveAttribute('for', 'codeforces-url-input');

    const input = screen.getByPlaceholderText('https://codeforces.com');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'codeforces-url-input');
    expect(input).toHaveClass('input');
    expect(input).toHaveValue('https://codeforces.com/profile/alice');

    fireEvent.change(input, { target: { value: 'https://codeforces.com/profile/newalice' } });
    expect(onCodeforcesChange).toHaveBeenCalledWith('https://codeforces.com/profile/newalice');
  });

  it('renders all six profile links and portfolio in the grid', () => {
    render(<SocialLinksForm {...defaultProps} />);

    expect(screen.getByLabelText(/GitHub/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/LinkedIn/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/LeetCode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CodeChef/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/HackerRank/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Codeforces/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Personal Portfolio/i)).toBeInTheDocument();
  });
});
