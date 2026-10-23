import React from 'react';
import { BookOpen } from 'lucide-react';
import { ResourceItem } from './ResourceItem';
import type { StudyResource } from '@/shared/types';

interface SubjectCardProps {
  subject: string;
  items: StudyResource[];
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, items }) => {
  return (
    <section
      aria-labelledby={`subject-${subject.replace(/\s+/g, '-').toLowerCase()}`}
      className="rounded-2xl border border-edge bg-surface-raised p-4 sm:p-6 space-y-4 shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-edge pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
          <h3
            id={`subject-${subject.replace(/\s+/g, '-').toLowerCase()}`}
            className="font-heading text-body-md sm:text-headline-md font-bold text-ink"
          >
            {subject}
          </h3>
        </div>
        <span className="text-label-sm font-semibold text-ink-muted px-2.5 py-1 rounded-full bg-surface-sunken">
          {items.length} {items.length === 1 ? 'material' : 'materials'}
        </span>
      </div>

      <div className="grid gap-3">
        {items.map((resource) => (
          <ResourceItem key={resource.id} resource={resource} />
        ))}
      </div>
    </section>
  );
};
