import React, { createContext, useContext, useEffect } from 'react';

// ============================================================================
// 1. PUBLIC THEME PROVIDER
// ============================================================================
interface PublicThemeContextType {
  theme: 'light';
}

const PublicThemeContext = createContext<PublicThemeContextType>({ theme: 'light' });

export const PublicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Proactively remove any stray dark class from documentElement/body
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    }
    if (document.body.classList.contains('dark')) {
      document.body.classList.remove('dark');
    }
  }, []);

  return (
    <PublicThemeContext.Provider value={{ theme: 'light' }}>
      <div id="public-root" className="min-h-screen bg-[#FAFAFA] text-neutral-900 w-full antialiased font-sans">
        {children}
      </div>
    </PublicThemeContext.Provider>
  );
};

export const usePublicTheme = () => useContext(PublicThemeContext);

// ============================================================================
// 2. STUDENT THEME PROVIDER
// ============================================================================
interface StudentThemeContextType {
  theme: 'light';
}

const StudentThemeContext = createContext<StudentThemeContextType>({ theme: 'light' });

export const StudentThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Student portal stays on its fixed clean academic theme, strictly independent of admin
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    }
    if (document.body.classList.contains('dark')) {
      document.body.classList.remove('dark');
    }
  }, []);

  return (
    <StudentThemeContext.Provider value={{ theme: 'light' }}>
      <div id="student-root" className="min-h-screen bg-[#f8fafc] text-neutral-900 w-full antialiased font-sans">
        {children}
      </div>
    </StudentThemeContext.Provider>
  );
};

export const useStudentTheme = () => useContext(StudentThemeContext);
