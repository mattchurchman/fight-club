import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Method } from '@shared/index.ts';
import { useSession } from '../auth/SessionProvider.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { BoutCard } from '../events/BoutCard.tsx';
import type { BoutPickProps } from '../events/BoutCard.tsx';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import { BudgetMeter } from './BudgetMeter.tsx';
import { FirstBloodPicker } from './FirstBloodPicker.tsx';
import { previewPickScore } from './preview.ts';
import { usePickDraft } from './usePickDraft.ts';

interface PickBuilderProps {
  event: EventWithId;
  bouts: BoutWithId[];
}

/** Mounted by EventPage for the active event (docs/tasks/T14). */
export function PickBuilder({ event, bouts }: PickBuilderProps) {
  const { profile } = useSession();
  const { show } = useToast();
  const {
    loading,
    readOnly,
    entry,
    draft,
    validation,
    budget,
    allocated,
    activeBoutIds,
    setWinner,
    setMethod,
    setStake,
    setLock,
    setFirstBlood,
    autoBalance,
    submit,
    submitting,
  } = usePickDraft(event.id, event, bouts);

  const boutErrors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const error of validation.errors) {
      if (error.boutId && !map[error.boutId]) map[error.boutId] = error.message;
    }
    return map;
  }, [validation]);

  if (loading) {
    return null;
  }

  const canAfford = !profile || profile.balance >= event.buyIn;

  if (readOnly && !entry) {
    return <EmptyState title="No entry" description="You didn't pick this one." />;
  }

  async function handleSubmit() {
    try {
      await submit();
      show(entry ? 'Picks updated.' : 'Picks in. Good luck.', { variant: 'success' });
    } catch {
      show('Picks locked. No take-backs.', { variant: 'error' });
    }
  }

  const submitDisabledReason = !canAfford
    ? "You're broke. Beg the admin."
    : (validation.errors[0]?.message ?? null);

  return (
    <div className="flex flex-col gap-3 pb-4">
      {!canAfford && !readOnly ? (
        <Card className="mx-4 flex items-center justify-between gap-3 border-loss/40 bg-loss/10">
          <p className="text-sm text-loss">You&apos;re broke. Beg the admin.</p>
          <Link to="/wallet">
            <Button type="button" variant="secondary">
              Wallet
            </Button>
          </Link>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 px-4">
        {bouts
          .filter((bout) => bout.isMainCard)
          .map((bout) => {
            const isActive = activeBoutIds.includes(bout.id);
            if (!isActive) {
              return <BoutCard key={bout.id} bout={bout} />;
            }

            const draftPick = draft.picks[bout.id];
            const isLock = draft.lockBoutId === bout.id;
            const preview =
              draftPick?.winner !== undefined &&
              draftPick.method !== undefined &&
              typeof draftPick.stake === 'number'
                ? previewPickScore(
                    { winner: draftPick.winner, method: draftPick.method, stake: draftPick.stake },
                    bout,
                    isLock,
                  )
                : null;

            const pick: BoutPickProps = {
              winner: draftPick?.winner,
              method: draftPick?.method,
              stake: draftPick?.stake,
              isLock,
              readOnly,
              preview: readOnly ? null : preview,
              scoreTotal: entry?.score?.byBout[bout.id]?.total ?? null,
              errorMessage: boutErrors[bout.id],
              onSelectWinner: (winner) => setWinner(bout.id, winner),
              onSelectMethod: (method: Method) => setMethod(bout.id, method),
              onChangeStake: (stake) => setStake(bout.id, stake),
              onToggleLock: () => setLock(bout.id),
            };

            return <BoutCard key={bout.id} bout={bout} pick={pick} />;
          })}
      </div>

      {event.firstBloodEnabled ? (
        <FirstBloodPicker
          bouts={bouts}
          activeIds={activeBoutIds}
          value={draft.firstBlood}
          readOnly={readOnly}
          errorMessage={validation.errors.find((e) => e.code.startsWith('FIRST_BLOOD'))?.message}
          onChange={setFirstBlood}
        />
      ) : null}

      {!readOnly ? (
        <BudgetMeter
          allocated={allocated}
          budget={budget}
          onAutoBalance={autoBalance}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitDisabledReason={submitDisabledReason}
        />
      ) : null}
    </div>
  );
}
