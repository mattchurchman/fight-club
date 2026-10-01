import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Card } from '../../../components/ui/Card.tsx';
import { Chip } from '../../../components/ui/Chip.tsx';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../../components/ui/Skeleton.tsx';
import { useBouts, useEvent } from '../../events/hooks.ts';
import type { BoutWithId, EventWithId } from '../../events/hooks.ts';
import { EVENT_STATUS_LABEL, formatEventDateTime } from '../../events/format.ts';
import { ActionsPanel } from './ActionsPanel.tsx';
import { BoutRow } from './BoutRow.tsx';
import { moveMainCardBout, toggleMainCard } from './card.ts';
import { overrideOdds, saveCard, setEventEnabled, setEventTerms, setResult } from './eventWrites.ts';
import type { ResultInput } from './eventWrites.ts';
import { canEditCard, canEditEventTerms, canEnterResult, canOverrideOdds } from './permissions.ts';

const inputClass =
  'min-h-11 rounded-chip border border-line bg-surface-2 px-4 text-sm text-text placeholder-muted focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

function changedBouts(before: readonly BoutWithId[], after: readonly BoutWithId[]): BoutWithId[] {
  const orig = new Map(before.map((b) => [b.id, b]));
  return after.filter((b) => {
    const o = orig.get(b.id);
    return !o || o.order !== b.order || o.isMainCard !== b.isMainCard;
  });
}

function TermsCard({ event, eventId }: { event: EventWithId; eventId: string }) {
  const editable = canEditEventTerms(event.status);
  const [buyIn, setBuyIn] = useState(event.buyIn.toString());
  const [firstBloodEnabled, setFirstBloodEnabled] = useState(event.firstBloodEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [enabling, setEnabling] = useState(false);

  const handleToggleEnabled = async () => {
    setEnabling(true);
    setError('');
    try {
      await setEventEnabled(eventId, !event.enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEnabling(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextBuyIn = Math.max(1, Math.floor(Number(buyIn)));
    if (!Number.isFinite(nextBuyIn)) {
      setError('Buy-in must be a whole number.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setEventTerms(eventId, { buyIn: nextBuyIn, firstBloodEnabled });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase text-muted">Event terms</h2>
        <Button
          variant={event.enabled ? 'secondary' : 'primary'}
          className="min-h-8 px-3 text-xs"
          disabled={enabling}
          onClick={handleToggleEnabled}
        >
          {event.enabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
      <p className="text-sm text-muted">
        {EVENT_STATUS_LABEL[event.status]} · locks {formatEventDateTime(event.lockAt.toMillis())}
      </p>
      {editable ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted" htmlFor="buy-in">
              Buy-in (tokens)
            </label>
            <input id="buy-in" type="number" min={1} value={buyIn} onChange={(e) => setBuyIn(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-center gap-2">
            <Chip selected={firstBloodEnabled} onSelect={() => setFirstBloodEnabled(true)}>
              First blood on
            </Chip>
            <Chip selected={!firstBloodEnabled} onSelect={() => setFirstBloodEnabled(false)}>
              First blood off
            </Chip>
          </div>
          {error ? <p className="text-sm text-red">{error}</p> : null}
          <Button type="submit" variant="secondary" disabled={saving} className="min-h-9 self-start px-3 text-xs">
            {saving ? 'Saving…' : 'Save terms'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-text">
          Buy-in {event.buyIn} tokens · First blood {event.firstBloodEnabled ? 'on' : 'off'}
          <span className="block text-xs text-muted">Locked once the event leaves `open`.</span>
        </p>
      )}
    </Card>
  );
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ?? null;
  const event = useEvent(eventId);
  const bouts = useBouts(eventId);
  const [busyBoutId, setBusyBoutId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (event === undefined || bouts === undefined) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (event === null || eventId === null) {
    return <EmptyState title="Event not found" action={<Link to="/admin/events">Back to events</Link>} />;
  }

  const card = [...bouts].filter((b) => b.isMainCard).sort((a, b) => a.order - b.order);
  const sorted = [...bouts].sort((a, b) => a.order - b.order);

  const run = async (boutId: string, task: () => Promise<void>) => {
    setBusyBoutId(boutId);
    setError('');
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusyBoutId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className={clsx('font-display text-xl uppercase text-text')}>{event.name}</h1>
        {event.subtitle ? <p className="text-sm text-muted">{event.subtitle}</p> : null}
      </div>

      <TermsCard event={event} eventId={eventId} />

      <ActionsPanel eventId={eventId} status={event.status} onDone={() => undefined} />

      {error ? <p className="text-sm text-red">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase text-muted">Card ({sorted.length} bouts)</h2>
        {sorted.map((bout) => {
          const cardIndex = card.findIndex((b) => b.id === bout.id);
          return (
            <BoutRow
              key={bout.id}
              bout={bout}
              isFirstOnCard={cardIndex <= 0}
              isLastOnCard={cardIndex === -1 || cardIndex === card.length - 1}
              canEditCard={canEditCard(event.status)}
              canOverrideOdds={canOverrideOdds(event.status)}
              canEnterResult={canEnterResult(event.status)}
              busy={busyBoutId === bout.id}
              onMove={(direction) =>
                run(bout.id, async () => {
                  const next = moveMainCardBout(bouts, bout.id, direction);
                  const changed = changedBouts(bouts, next);
                  if (changed.length > 0) await saveCard(eventId, next, changed);
                })
              }
              onToggleMainCard={() =>
                run(bout.id, async () => {
                  const next = toggleMainCard(bouts, bout.id);
                  await saveCard(eventId, next, changedBouts(bouts, next));
                })
              }
              onOverrideOdds={(a, b) => run(bout.id, () => overrideOdds(eventId, bout.id, a, b))}
              onSetResult={(input: ResultInput) =>
                run(bout.id, () => {
                  if (event.status !== 'locked' && event.status !== 'live') return Promise.resolve();
                  return setResult(eventId, bout.id, event.status, input);
                })
              }
            />
          );
        })}
      </div>
    </div>
  );
}
