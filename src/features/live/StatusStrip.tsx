import type { Bout } from '@shared/index.ts';
import { StatusPill } from '../../components/ui/StatusPill.tsx';
import { TokenPill } from '../../components/ui/TokenPill.tsx';
import type { EventWithId } from '../events/hooks.ts';
import { currentBout, fightOrder } from './derive.ts';

interface StatusStripProps<Ts> {
  event: EventWithId;
  bouts: Record<string, Bout<Ts>>;
}

/** Top-of-tab status line: live/final pill, fight progress, pot (docs/tasks/T36). */
export function StatusStrip<Ts>({ event, bouts }: StatusStripProps<Ts>) {
  const order = fightOrder(bouts);
  const current = currentBout(bouts);
  const fightNumber = current ? order.indexOf(current) + 1 : order.length;
  const final = event.status === 'final';

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex items-center gap-3">
        <StatusPill status={event.status} />
        {!final && order.length > 0 ? (
          <p className="font-display text-sm uppercase tracking-wide text-text">
            Fight {fightNumber} of {order.length}
          </p>
        ) : null}
      </div>
      <span className="flex items-center gap-1.5 text-xs text-muted">
        {final ? 'Pot paid' : 'Pot'} <TokenPill balance={event.pot} />
      </span>
    </div>
  );
}
