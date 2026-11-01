import React from 'react';

export interface MasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  children,
  className = '',
  cols = 3,
  ...props
}) => {
  const colClass =
    cols === 2
      ? 'columns-1 md:columns-2 gap-6'
      : cols === 4
      ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6'
      : 'columns-1 md:columns-2 lg:columns-3 gap-6';

  return (
    <div
      className={`masonry-grid w-full ${colClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface MasonryItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const MasonryItem: React.FC<MasonryItemProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`masonry-item break-inside-avoid mb-6 w-full inline-block ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
