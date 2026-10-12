import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StudentSession } from '@/shared/types';
import { directoryApi } from '@/features/directory/api';
import { authApi } from '@/features/auth/api';
import { Navbar } from '@/shared/layout/Navbar';
import { FooterReveal } from '@/shared/layout/FooterReveal';
import { useCountUp } from '@/shared/hooks/useCountUp';
import { HomeHero } from './components/HomeHero';
import { HomeSearchBand } from './components/HomeSearchBand';
import { HomeEventsBand } from './components/HomeEventsBand';

interface HomePageProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [featuredStudents, setFeaturedStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentTotal, setStudentTotal] = useState<number | null>(null);

  const loadFeaturedStudents = useCallback(() => {
    setStudentsLoading(true);
    setStudentsError(null);

    directoryApi
      .getPublicStudents({ limit: 3 })
      .then((data) => {
        setFeaturedStudents(Array.isArray(data?.students) ? data.students : []);
        if (typeof data?.total === 'number') setStudentTotal(data.total);
      })
      .catch((err) => {
        setStudentsError(err?.message || 'Unable to load spotlight students.');
      })
      .finally(() => {
        setStudentsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadFeaturedStudents();
  }, [loadFeaturedStudents]);

  useEffect(() => {
    document.title = 'ELITE Student Portal — Department of IT, SASI';
  }, []);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) {
      navigate('/students');
      return;
    }
    navigate(`/students?search=${encodeURIComponent(clean)}`);
  };

  const handleSignIn = () => {
    window.location.href = authApi.getOAuthAuthorizeUrl();
  };

  const stats = [
    studentTotal !== null ? { label: 'Profiles in the directory', value: studentTotal } : null,
  ].filter((stat): stat is { label: string; value: number } => stat !== null);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        <HomeHero
          onSignIn={handleSignIn}
          loading={studentsLoading}
          featuredStudents={featuredStudents}
          error={studentsError}
          onRetry={loadFeaturedStudents}
        />

        {stats.length > 0 && (
          <section aria-label="Directory highlights" className="border-b border-edge">
            <div className="mx-auto max-w-canvas px-6 py-10 sm:px-10">
              <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {stats.map((stat) => (
                  <HomeStatCounter key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </dl>
            </div>
          </section>
        )}

        <HomeSearchBand
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
        />

        <HomeEventsBand />
      </main>

      <FooterReveal />
    </div>
  );
};

const HomeStatCounter: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const animatedValue = useCountUp(value);
  return (
    <div>
      <dd className="font-heading text-headline-lg font-extrabold tabular-nums text-ink">
        {animatedValue}
      </dd>
      <dt className="mt-1 text-body-sm text-ink-secondary">{label}</dt>
    </div>
  );
};

export default HomePage;
