import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';

export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  to?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  breathing?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  to,
  variant = 'primary',
  breathing = false,
  children,
  className,
  ...props
}) => {
  const baseClasses = cn(
    'glow-btn relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium text-sm transition-all duration-200 select-none cursor-pointer',
    variant === 'primary' &&
      'bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold shadow-md border border-purple-400/40 hover:from-purple-500 hover:to-purple-600',
    variant === 'secondary' &&
      'bg-[#11111a] text-white/90 border border-white/10 hover:bg-[#181824] hover:text-white hover:border-purple-500/40',
    variant === 'accent' &&
      'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-semibold shadow-md border border-pink-400/30',
    variant === 'ghost' &&
      'bg-transparent text-white/80 hover:bg-white/5 hover:text-white',
    breathing && 'glow-breathing',
    className
  );

  if (to) {
    return (
      <Link to={to} className={baseClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button className={baseClasses} {...props}>
      {children}
    </button>
  );
};

export default GlowButton;
