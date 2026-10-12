import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GithubInstructions } from '../GithubInstructions';

describe('GithubInstructions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the Instructions button and opens the modal upon clicking', async () => {
    render(<GithubInstructions />);

    const button = screen.getByRole('button', { name: /open github instructions guide/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Instructions')).toBeInTheDocument();

    // Click the button to open instructions modal
    fireEvent.click(button);

    // Verify modal is open and shows the title and key guide contents
    expect(await screen.findByText("GitHub Beginner's Guide")).toBeInTheDocument();
    expect(screen.getByText('What is Git and GitHub?')).toBeInTheDocument();
    expect(screen.getByText('Daily Workflow Summary')).toBeInTheDocument();
    expect(screen.getByText('Quick Cheat Sheet Table')).toBeInTheDocument();
  });

  it('copies command to clipboard when Copy button is clicked', async () => {
    render(<GithubInstructions />);

    const openBtn = screen.getByRole('button', { name: /open github instructions guide/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText("GitHub Beginner's Guide")).toBeInTheDocument();

    const copyButtons = screen.getAllByRole('button', { name: /copy command/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getAllByText('Copied!').length).toBeGreaterThan(0);
    });
  });

  it('closes modal when the close button is clicked', async () => {
    render(<GithubInstructions />);

    const openBtn = screen.getByRole('button', { name: /open github instructions guide/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText("GitHub Beginner's Guide")).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("GitHub Beginner's Guide")).not.toBeInTheDocument();
    });
  });

  it('highlights the initial step and updates active step on click jump', async () => {
    render(<GithubInstructions />);

    const openBtn = screen.getByRole('button', { name: /open github instructions guide/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText("GitHub Beginner's Guide")).toBeInTheDocument();

    // Verify initial active step is step-1
    const step1Buttons = screen.getAllByRole('button', { name: /1\. Git vs GitHub/i });
    expect(step1Buttons[0]).toHaveAttribute('aria-current', 'true');

    // Click step 3
    const step3Buttons = screen.getAllByRole('button', { name: /3\. Create Repo/i });
    fireEvent.click(step3Buttons[0]);

    await waitFor(() => {
      expect(step3Buttons[0]).toHaveAttribute('aria-current', 'true');
      expect(step1Buttons[0]).not.toHaveAttribute('aria-current');
    });
  });

  it('updates active step highlighter when scrolling through instructions', async () => {
    render(<GithubInstructions />);

    const openBtn = screen.getByRole('button', { name: /open github instructions guide/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText("GitHub Beginner's Guide")).toBeInTheDocument();

    const content = document.getElementById('step-1')?.closest('.overflow-y-auto') as HTMLElement;
    expect(content).toBeTruthy();

    if (content) {
      vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 600,
        left: 0,
        right: 800,
        width: 800,
        height: 600,
      } as DOMRect);

      // Mock positions for steps 1 to 6 so step 4 is at relative top 50px
      for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`step-${i}`);
        if (el) {
          vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
            top: (i - 4) * 300 + 50,
            bottom: (i - 4) * 300 + 350,
            left: 0,
            right: 600,
            width: 600,
            height: 300,
          } as DOMRect);
        }
      }

      Object.defineProperty(content, 'scrollTop', { value: 900, configurable: true });
      fireEvent.scroll(content);

      await waitFor(() => {
        const step4Buttons = screen.getAllByRole('button', { name: /4\. Clone/i });
        expect(step4Buttons[0]).toHaveAttribute('aria-current', 'true');
      });

      // Test scroll to bottom triggers last step
      Object.defineProperty(content, 'scrollHeight', { value: 4000, configurable: true });
      Object.defineProperty(content, 'clientHeight', { value: 600, configurable: true });
      Object.defineProperty(content, 'scrollTop', { value: 3390, configurable: true });
      fireEvent.scroll(content);

      await waitFor(() => {
        const step18Buttons = screen.getAllByRole('button', { name: /18\. Daily Workflow/i });
        expect(step18Buttons[0]).toHaveAttribute('aria-current', 'true');
      });
    }
  });
});
