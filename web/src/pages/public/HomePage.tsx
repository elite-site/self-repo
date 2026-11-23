import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StudentSession } from '@/shared/types';
import { directoryApi } from '@/features/directory/api';
import { authApi } from '@/features/auth/api';
import { Navbar } from '@/shared/layout/Navbar';
import { FooterReveal } from '@/shared/layout/FooterReveal';
import { HomeHero } from './components/HomeHero';
import { HomeStudentStrip } from './components/HomeStudentStrip';
import { HomeSearchBand } from './components/HomeSearchBand';
import { HomeSpotlightSection } from './components/HomeSpotlightCard';
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
      .getPublicStudents({ limit: 6 })
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

  // Split students: first 3 go to spotlight cards, all go to the marquee strip
  const spotlightStudents = featuredStudents.slice(0, 3);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        {/* 1. Full-width hero with word-stagger headline */}
        <HomeHero onSignIn={handleSignIn} studentTotal={studentTotal} />

        {/* 2. Living proof: scrolling strip of student avatar chips */}
        <HomeStudentStrip students={featuredStudents} loading={studentsLoading} />

        {/* 3. Spotlight cards — 3 students, scroll-reveal stagger */}
        <HomeSpotlightSection
          loading={studentsLoading}
          students={spotlightStudents}
          error={studentsError}
          onRetry={loadFeaturedStudents}
        />

        {/* 4. Search — slide-in-left/right reveal */}
        <HomeSearchBand
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
        />

        {/* 5. Events CTA — scale-pop reveal */}
        <HomeEventsBand />
      </main>

      <FooterReveal />
    </div>
  );
};

export default HomePage;
