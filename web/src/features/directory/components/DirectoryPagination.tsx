import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface DirectoryPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export const DirectoryPagination: React.FC<DirectoryPaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-2"
      aria-label="Directory pagination"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page === 1}
        onClick={() => {
          onPageChange(page - 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Previous page"
        icon={ChevronLeft}
      >
        Previous
      </Button>

      <span className="px-4 text-label-md text-ink-secondary" aria-current="page">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="secondary"
        size="sm"
        disabled={page === totalPages}
        onClick={() => {
          onPageChange(page + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Next page"
        icon={ChevronRight}
      >
        Next
      </Button>
    </nav>
  );
};
