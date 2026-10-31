import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MetricTile } from '@/shared/ui/MetricTile';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';

describe('MetricTile Component', () => {
  it('renders dynamic numeric value and suffix', () => {
    render(
      <BrowserRouter>
        <MetricTile
          icon={<Clock size={18} aria-hidden="true" />}
          label="Course Progress"
          value={3}
          suffix=" Modules Active"
          subLabel="3 in progress, 2 completed"
          to="/learning"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Course Progress')).toBeInTheDocument();
    expect(screen.getByText(/Modules Active/)).toBeInTheDocument();
    expect(screen.getByText('3 in progress, 2 completed')).toBeInTheDocument();
  });

  it('renders zero state with appropriate exploration prompt', () => {
    render(
      <BrowserRouter>
        <MetricTile
          icon={<Calendar size={18} aria-hidden="true" />}
          label="Coding Streak"
          value={0}
          suffix=" Days"
          subLabel="Connect GitHub to track streak"
          to="/github"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Coding Streak')).toBeInTheDocument();
    expect(screen.getByText(/Days/)).toBeInTheDocument();
    expect(screen.getByText('Connect GitHub to track streak')).toBeInTheDocument();
  });

  it('renders placement readiness and verified sublabel', () => {
    render(
      <BrowserRouter>
        <MetricTile
          icon={<CheckCircle2 size={18} aria-hidden="true" />}
          label="Placement Readiness"
          value={100}
          suffix="/100"
          subLabel="Resume & Portfolio verified"
          to="/profile"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Placement Readiness')).toBeInTheDocument();
    expect(screen.getByText(/\/100/)).toBeInTheDocument();
    expect(screen.getByText('Resume & Portfolio verified')).toBeInTheDocument();
  });
});
