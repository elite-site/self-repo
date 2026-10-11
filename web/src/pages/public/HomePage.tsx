import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StudentSession } from '@/shared/types';
import { api } from '@/services/api';
import { Navbar } from '@/shared/layout/Navbar';
import { Footer } from '@/shared/layout/Footer';
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
  const [studentTotal, setStudentTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .getPublicStudents({ limit: 3 })
      .then((data) => {
        if (cancelled) return;
        setFeaturedStudents(Array.isArray(data?.students) ? data.students : []);
        if (typeof data?.total === 'number') setStudentTotal(data.total);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    window.location.href = api.getOAuthAuthorizeUrl();
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
        />

        {stats.length > 0 && (
          <section aria-label="Directory highlights" className="border-b border-edge">
            <div className="mx-auto max-w-canvas px-6 py-10 sm:px-10">
              <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dd className="font-heading text-headline-lg font-extrabold tabular-nums text-ink">
                      {stat.value}
                    </dd>
                    <dt className="mt-1 text-body-sm text-ink-secondary">{stat.label}</dt>
                  </div>
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

      <Footer />
    </div>
  );
};

export default HomePage;
