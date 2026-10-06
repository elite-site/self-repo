import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ReadmeExcerptViewProps {
  excerpt?: string | null;
  fallbackDescription?: string | null;
  className?: string;
  maxCollapsedHeight?: number;
}

export const ReadmeExcerptView: React.FC<ReadmeExcerptViewProps> = ({
  excerpt,
  fallbackDescription,
  className = '',
  maxCollapsedHeight = 90,
}) => {
  const [expanded, setExpanded] = useState(false);
  const content = excerpt || fallbackDescription || '';

  if (!content) return null;

  // If using plain fallback description with no excerpt
  if (!excerpt && fallbackDescription) {
    return (
      <p className={`text-body-sm text-ink-secondary leading-relaxed ${className}`}>
        {fallbackDescription}
      </p>
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

      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="inline-flex items-center gap-1 text-label-xs font-bold text-brand hover:underline pt-0.5 cursor-pointer"
        >
          <span>{expanded ? 'Show less' : 'Read more'}</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}
    </div>
  );
};
