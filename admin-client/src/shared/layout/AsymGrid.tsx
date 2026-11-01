import React from 'react';

export interface AsymGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const AsymGrid: React.FC<AsymGridProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`asym-grid grid grid-cols-1 lg:grid-cols-12 gap-6 w-full ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface AsymFeaturedProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  cols?: 7 | 8;
}

export const AsymFeatured: React.FC<AsymFeaturedProps> = ({
  children,
  className = '',
  cols = 8,
  ...props
}) => {
  const colClass = cols === 7 ? 'lg:col-span-7' : 'lg:col-span-8';
  return (
    <div
      className={`asym-featured col-span-1 ${colClass} flex flex-col gap-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface AsymSideProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  cols?: 4 | 5;
}

export const AsymSide: React.FC<AsymSideProps> = ({
  children,
  className = '',
  cols = 4,
  ...props
}) => {
  const colClass = cols === 5 ? 'lg:col-span-5' : 'lg:col-span-4';
  return (
    <div
      className={`asym-side col-span-1 ${colClass} flex flex-col gap-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface AsymAccentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const AsymAccent: React.FC<AsymAccentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`asym-accent bg-brand-soft border border-brand/30 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-quick text-ink ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
