import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Method } from '@shared/index.ts';
import { DEFAULTS } from '@shared/index.ts';
import { useToast } from '../../components/ui/Toast.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import { DeckTopBar } from './DeckTopBar.tsx';
import { isPickComplete } from './deckProgress.ts';
import { FightSlide } from './FightSlide.tsx';
import { previewPickScore } from './preview.ts';
import { ReviewSlide } from './ReviewSlide.tsx';
import { submitLabel } from './submitLabel.ts';
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
 * plus a `ReviewSlide` (T33).
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
  const { profile } = useSession();
  const navigate = useNavigate();
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

  const fightComplete = active.map((bout) => isPickComplete(draft.draft.picks[bout.id]));
  const lockBoutId = draft.draft.lockBoutId;
  const hasLock =
    lockBoutId !== null &&
    active.some((bout) => bout.id === lockBoutId) &&
    isPickComplete(draft.draft.picks[lockBoutId]);

  const labelInfo = submitLabel({
    broke: !!profile && profile.balance < event.buyIn,
    missingPicks: fightComplete.filter((complete) => !complete).length,
    budgetDiff: draft.allocated - draft.budget,
    hasLock,
    hasEntry: !!draft.entry,
  });

  async function handleSubmit() {
    onAttemptSubmit();
    if (!labelInfo.ready) return;
    try {
      await draft.submit();
      show(draft.entry ? 'Picks updated.' : 'Picks in. Good luck.', { variant: 'success' });
      navigate(`/event/${event.id}`);
    } catch {
      show('Picks locked. No take-backs.', { variant: 'error' });
    }
  }

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
          className="flex w-full shrink-0 snap-center snap-always flex-col gap-4 overflow-y-auto p-4"
        >
          <ReviewSlide
            bouts={active}
            picks={draft.draft.picks}
            lockBoutId={lockBoutId}
            readOnly={draft.readOnly}
            minStake={DEFAULTS.minStake}
            maxStake={DEFAULTS.maxStake}
            stakeStep={DEFAULTS.stakeStep}
            onJumpToBout={(boutId) => goTo(active.findIndex((bout) => bout.id === boutId))}
            onChangeStake={draft.setStake}
            onToggleLock={draft.setLock}
            firstBloodEnabled={event.firstBloodEnabled}
            firstBlood={draft.draft.firstBlood}
            firstBloodError={
              draft.validation.errors.find((error) => error.code.startsWith('FIRST_BLOOD'))
                ?.message
            }
            onChangeFirstBlood={draft.setFirstBlood}
            onAutoBalance={draft.autoBalance}
            submitLabel={labelInfo.label}
            submitReady={labelInfo.ready}
            submitting={draft.submitting}
            onSubmit={() => void handleSubmit()}
          />
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
