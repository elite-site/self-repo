import React from 'react';
import { Card } from '@/shared/ui/Card';
import { Award } from 'lucide-react';
import type { CodeChefDetails } from '../types';

interface CodeChefBadgesProps {
  badges: CodeChefDetails['badges'];
}

export const CodeChefBadges: React.FC<CodeChefBadgesProps> = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <Card className="p-5 border border-border bg-surface text-foreground shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-amber-500" />
        <div>
          <h3 className="font-bold text-base text-foreground">Earned Badges</h3>
          <p className="text-xs text-foreground-muted">{badges.length} CodeChef achievement badges</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {badges.map((b, idx) => (
          <div
            key={idx}
            className="p-3 bg-surface-muted/50 border border-border rounded-xl flex flex-col items-center text-center hover:bg-surface-muted transition-colors"
          >
            {b.icon && b.icon.startsWith('http') ? (
              <img src={b.icon} alt={b.title || 'Badge'} className="w-12 h-12 object-contain mb-2" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl mb-2">
                {b.icon || '🏅'}
              </div>
            )}
            <h4 className="font-bold text-xs text-foreground truncate w-full">{b.title || b.name || 'Achievement'}</h4>
            {b.description && (
              <p className="text-[11px] text-foreground-muted line-clamp-2 mt-0.5">{b.description}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
