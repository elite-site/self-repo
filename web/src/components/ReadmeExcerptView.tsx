import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface ReadmeExcerptViewProps {
  excerpt?: string | null;
  repoId?: string;
  fallbackDescription?: string | null;
  className?: string;
  maxCollapsedHeight?: number;
}

export const ReadmeExcerptView: React.FC<ReadmeExcerptViewProps> = ({
  excerpt: initialExcerpt,
  repoId,
  fallbackDescription,
  className = '',
  maxCollapsedHeight = 90,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loadedExcerpt, setLoadedExcerpt] = useState<string | null>(initialExcerpt || null);
  const [loading, setLoading] = useState(false);

  const excerpt = loadedExcerpt || initialExcerpt;
  const content = excerpt || fallbackDescription || '';

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded && !excerpt && repoId) {
      setLoading(true);
      try {
        const data = await api.getGithubRepoReadme(repoId);
        if (data?.readmeExcerpt) {
          setLoadedExcerpt(data.readmeExcerpt);
        }
      } catch (err) {
        console.error('Failed to load README:', err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  if (!content && !repoId) return null;

  // If using plain fallback description with no excerpt yet
  if (!excerpt && !expanded) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {fallbackDescription && (
          <p className="text-body-sm text-ink-secondary leading-relaxed">
            {fallbackDescription}
          </p>
        )}
        {repoId && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className="inline-flex items-center gap-1 text-label-xs font-bold text-brand hover:underline pt-0.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Loading README...</span>
              </>
            ) : (
              <>
                <span>View README</span>
                <ChevronDown size={13} />
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  const isLong = content.length > 200;

  return (
    <div className={`space-y-1.5 text-body-sm text-ink-secondary ${className}`}>
      <div
        className="relative overflow-hidden transition-all duration-300"
        style={!expanded && isLong ? { maxHeight: `${maxCollapsedHeight}px` } : undefined}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-1 prose-ul:my-1 prose-pre:my-1 text-xs sm:text-sm">
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            components={{
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-brand hover:underline"
                  onClick={(e) => e.stopPropagation()}
                />
              ),
              img: () => null, // Never hotlink images in excerpt view
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {!expanded && isLong && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
        )}
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="inline-flex items-center gap-1 text-label-xs font-bold text-brand hover:underline pt-0.5 cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>Loading README...</span>
          </>
        ) : (
          <>
            <span>{expanded ? 'Show less' : 'Read more'}</span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </>
        )}
      </button>
    </div>
  );
};
