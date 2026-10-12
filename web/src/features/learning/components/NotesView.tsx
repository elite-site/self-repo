import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { BookOpen } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface NotesViewProps {
  notes: string | null | undefined;
  className?: string;
}

export const NotesView: React.FC<NotesViewProps> = ({ notes, className }) => {
  if (!notes || notes.trim() === '') {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-edge p-12 text-center', className)}>
        <BookOpen className="size-10 text-ink-muted" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-ink-secondary">No notes provided for this lesson.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'surface rounded-xl border border-edge p-6 sm:p-8',
        'prose max-w-none text-ink',
        '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-ink [&_h1]:mb-4',
        '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mt-6 [&_h2]:mb-3',
        '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-4 [&_h3]:mb-2',
        '[&_p]:mb-4 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-ink-secondary',
        '[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:text-ink-secondary',
        '[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:text-ink-secondary',
        '[&_li]:mb-1',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-brand [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-muted',
        '[&_code]:rounded [&_code]:bg-surface-sunken [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-ink',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-sunken [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs',
        '[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
        '[&_th]:border-b [&_th]:border-edge [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold',
        '[&_td]:border-b [&_td]:border-edge [&_td]:p-2',
        className,
      )}
    >
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{notes}</ReactMarkdown>
    </div>
  );
};

export default NotesView;
