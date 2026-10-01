import { useState } from 'react';
import { BADGE_DEFINITIONS } from '@shared/badges.ts';
import { Card } from '../../components/ui/Card.tsx';

interface BadgesRowProps {
  earned: string[];
}

/**
 * Displays all badges: earned in color, unearned greyed out.
 * Tap to see the description.
 */
export function BadgesRow({ earned }: BadgesRowProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const badges = Object.values(BADGE_DEFINITIONS);

  return (
    <>
      <div className="flex flex-wrap gap-3 px-4">
        {badges.map((badge) => {
          const isEarned = earned.includes(badge.id);
          return (
            <button
              key={badge.id}
              onClick={() => setSelected(selected === badge.id ? null : badge.id)}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
                isEarned
                  ? 'bg-surface'
                  : 'bg-surface-variant opacity-50'
              }`}
              title={badge.name}
            >
              <span className="text-2xl">{badge.emoji}</span>
              <span className="text-xs font-semibold text-text">{badge.name}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <Card className="mx-4 bg-surface-variant p-3">
          <div className="flex gap-2">
            <span className="text-2xl">{BADGE_DEFINITIONS[selected]?.emoji}</span>
            <div>
              <p className="font-semibold text-text">{BADGE_DEFINITIONS[selected]?.name}</p>
              <p className="text-sm text-muted">{BADGE_DEFINITIONS[selected]?.description}</p>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
