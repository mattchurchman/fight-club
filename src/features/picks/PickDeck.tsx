import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Method } from '@shared/index.ts';
import { DEFAULTS } from '@shared/index.ts';
import { useToast } from '../../components/ui/Toast.tsx';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import { BudgetMeter } from './BudgetMeter.tsx';
import { DeckTopBar } from './DeckTopBar.tsx';
import { isPickComplete } from './deckProgress.ts';
import { FightSlide } from './FightSlide.tsx';
import { FirstBloodPicker } from './FirstBloodPicker.tsx';
import { previewPickScore } from './preview.ts';
import type { UsePickDraftResult } from './usePickDraft.ts';

interface PickDeckProps {
  event: EventWithId;
  bouts: BoutWithId[];
  draft: UsePickDraftResult;
  initialBoutId: string | null;
  attemptedSubmit: boolean;
  onAttemptSubmit: () => void;
}

/**
 * The deck shell (docs/tasks/T31): one horizontally-snapped `FightSlide` per active fight (T32)
 * plus a review slide, still reusing `BudgetMeter`/`FirstBloodPicker` there until T33 replaces
 * that with the real review/submit design.
 */
export function PickDeck({
  event,
  bouts,
  draft,
  initialBoutId,
  attemptedSubmit,
  onAttemptSubmit,
}: PickDeckProps) {
  const { show } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const active = useMemo(
    () =>
      draft.activeBoutIds
        .map((id) => bouts.find((bout) => bout.id === id))
        .filter((bout): bout is BoutWithId => bout !== undefined),
    [draft.activeBoutIds, bouts],
  );
  const slideCount = active.length + 1;

  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = initialBoutId ? active.findIndex((bout) => bout.id === initialBoutId) : -1;
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    // Only on mount — jumps straight to the fight the caller linked to.
    slideRefs.current[activeIndex]?.scrollIntoView({
      behavior: 'auto',
      inline: 'start',
      block: 'nearest',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        const index = slideRefs.current.indexOf(visible.target as HTMLDivElement);
        if (index >= 0) setActiveIndex(index);
      },
      { root: container, threshold: 0.6 },
    );
    for (const slide of slideRefs.current) {
      if (slide) observer.observe(slide);
    }
    return () => observer.disconnect();
  }, [slideCount]);

  useEffect(() => {
    const fightId = activeIndex < active.length ? (active[activeIndex]?.id ?? null) : null;
    if (searchParams.get('fight') === fightId) return;
    const next = new URLSearchParams(searchParams);
    if (fightId) next.set('fight', fightId);
    else next.delete('fight');
    setSearchParams(next, { replace: true });
  }, [activeIndex, active, searchParams, setSearchParams]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(slideCount - 1, index));
      slideRefs.current[clamped]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest',
      });
    },
    [slideCount],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') goTo(activeIndex - 1);
      else if (event.key === 'ArrowRight') goTo(activeIndex + 1);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, goTo]);

  async function handleSubmit() {
    onAttemptSubmit();
    try {
      await draft.submit();
      show(draft.entry ? 'Picks updated.' : 'Picks in. Good luck.', { variant: 'success' });
    } catch {
      show('Picks locked. No take-backs.', { variant: 'error' });
    }
  }

  const fightComplete = active.map((bout) => isPickComplete(draft.draft.picks[bout.id]));

  return (
    <>
      <DeckTopBar
        eventId={event.id}
        activeIndex={activeIndex}
        fightsCount={active.length}
        fightComplete={fightComplete}
        allocated={draft.allocated}
        budget={draft.budget}
        attemptedSubmit={attemptedSubmit}
      />
      <div
        ref={containerRef}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {active.map((bout, index) => {
          const draftPick = draft.draft.picks[bout.id];
          const isLock = draft.draft.lockBoutId === bout.id;
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

          return (
            <div
              key={bout.id}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className="w-full shrink-0 snap-center snap-always overflow-y-auto p-4"
            >
              <FightSlide
                bout={bout}
                pick={draftPick ?? {}}
                isLock={isLock}
                isLast={index === active.length - 1}
                readOnly={draft.readOnly}
                attemptedSubmit={attemptedSubmit}
                errorMessage={
                  draft.validation.errors.find((error) => error.boutId === bout.id)?.message
                }
                preview={draft.readOnly ? null : preview}
                minStake={DEFAULTS.minStake}
                maxStake={DEFAULTS.maxStake}
                stakeStep={DEFAULTS.stakeStep}
                onSelectWinner={(winner) => draft.setWinner(bout.id, winner)}
                onSelectMethod={(method: Method) => draft.setMethod(bout.id, method)}
                onChangeStake={(stake) => draft.setStake(bout.id, stake)}
                onToggleLock={() => draft.setLock(bout.id)}
                onNext={() => goTo(index + 1)}
              />
            </div>
          );
        })}

        <div
          ref={(el) => {
            slideRefs.current[active.length] = el;
          }}
          className="flex w-full shrink-0 snap-center snap-always flex-col gap-3 overflow-y-auto p-4"
        >
          {event.firstBloodEnabled ? (
            <FirstBloodPicker
              bouts={bouts}
              activeIds={draft.activeBoutIds}
              value={draft.draft.firstBlood}
              readOnly={draft.readOnly}
              errorMessage={
                draft.validation.errors.find((error) => error.code.startsWith('FIRST_BLOOD'))
                  ?.message
              }
              onChange={draft.setFirstBlood}
            />
          ) : null}
          {!draft.readOnly ? (
            <BudgetMeter
              allocated={draft.allocated}
              budget={draft.budget}
              onAutoBalance={draft.autoBalance}
              onSubmit={() => void handleSubmit()}
              submitting={draft.submitting}
              submitDisabledReason={draft.validation.errors[0]?.message ?? null}
            />
          ) : null}
        </div>
      </div>
      <div className="sr-only">
        <button type="button" onClick={() => goTo(activeIndex - 1)}>
          Previous fight
        </button>
        <button type="button" onClick={() => goTo(activeIndex + 1)}>
          Next fight
        </button>
      </div>
    </>
  );
}
