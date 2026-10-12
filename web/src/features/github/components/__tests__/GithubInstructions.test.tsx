import React from 'react';
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
});
