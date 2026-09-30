import type { BoutWithId } from '../events/hooks.ts';
import { findLastFinalBout, formatLastResult } from './lastResult.ts';

interface LastResultBannerProps {
  bouts: BoutWithId[];
}

/** "Pereira def. Ankalaev — KO R2 4:12" once a bout goes final (docs/tasks/T15). */
export function LastResultBanner({ bouts }: LastResultBannerProps) {
  const bout = findLastFinalBout(bouts);
  const text = bout ? formatLastResult(bout) : null;
  if (!text) return null;

  return (
    <div className="mx-4 rounded-chip border border-gold/40 bg-gold/10 px-3 py-2 text-center text-sm font-semibold text-gold">
      {text}
    </div>
  );
}
