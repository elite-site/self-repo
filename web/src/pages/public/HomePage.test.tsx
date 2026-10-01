import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { api } from '../../services/api';

vi.mock('../../components/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar" />,
}));
vi.mock('../../components/Footer', () => ({
  Footer: () => <footer data-testid="footer" />,
}));

const renderHome = async (session: null = null) => {
  const utils = render(
    <MemoryRouter>
      <HomePage session={session} onLogout={vi.fn()} />
    </MemoryRouter>,
  );
  // Let the public-video request settle so its state update lands inside act().
  await waitFor(() => expect(api.getPublicVideos).toHaveBeenCalled());
  return utils;
};

describe('HomePage (public landing)', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getPublicVideos').mockResolvedValue({ items: [], total: 0 });
  });

  it('states a value proposition instead of only naming the institution', async () => {
    await renderHome();
    const h1 = screen.getByRole('heading', { level: 1 });

    expect(h1).toBeInTheDocument();
    // The old headline shouted the product name in all caps.
    expect(h1.textContent).not.toMatch(/^ELITE STUDENT PORTAL$/);
    // The old subtext was the institution name and nothing else.
    expect(screen.getByText(/Browse verified profiles/i)).toBeInTheDocument();
  });

  it('renders the hero search as a labelled control, not an unlabelled box', async () => {
    await renderHome();

    const input = screen.getByLabelText(/search students/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Name, roll number, or skill');
  });

  it('keeps one sign-in label across the page', async () => {
    await renderHome();

    const signIn = screen.getAllByRole('button', { name: /student sign in/i });
    expect(signIn).toHaveLength(1);
  });

  it('offers exactly one secondary action, and no "or" divider', async () => {
    const { container } = await renderHome();

    expect(screen.getByRole('link', { name: /browse directory/i })).toBeInTheDocument();
    // The old hero separated the two CTAs with a hairline and the word "or".
    expect(container.textContent).not.toMatch(/>or</);
  });

  it('points visitors somewhere real when no video is published', async () => {
    await renderHome();

    await waitFor(() =>
      expect(screen.getByText(/no introduction videos published yet/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: /browse the directory/i })).toBeInTheDocument();
  });

  it('links to the public events page', async () => {
    await renderHome();
    expect(screen.getByRole('link', { name: /browse department events/i })).toHaveAttribute(
      'href',
      '/events',
    );
  });

  it('redirects a signed-in student to the dashboard', async () => {
    await renderHome({
      student: { id: '1', name: 'Aarav Sharma', rollNo: '22BT001' },
    } as never);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
