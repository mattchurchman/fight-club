import type { ReactNode } from 'react';
import { Card } from '../../components/ui/Card.tsx';

interface SectionProps {
  emoji: string;
  title: string;
  children: ReactNode;
}

function Section({ emoji, title, children }: SectionProps) {
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-wide text-text">
        <span aria-hidden="true">{emoji}</span> {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm text-muted">{children}</div>
    </Card>
  );
}

/** `/admin/help`: what the admin actually needs to do, and when. Separate from the player-facing
 * `/help` — this one's operational, not rules explanation. */
export function AdminHelpPage() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="px-1 text-sm text-muted">
        What you actually need to do, in order — before a card, during it, and after.
      </p>

      <Section emoji="📅" title="Days before the card">
        <p>
          Events pull in from ESPN automatically every morning. Check{' '}
          <strong className="text-text">/admin/events</strong> — numbered events (UFC 332, etc.)
          auto-enable; <strong className="text-text">Fight Nights need you to flip them
          Enabled</strong> yourself or players won't see them.
        </p>
        <p>
          Odds auto-populate too. If you want to turn on the First Blood prop, do it on the event
          detail page before it locks — the field is only editable while the event is still{' '}
          <strong className="text-text">open</strong>.
        </p>
      </Section>

      <Section emoji="🔒" title="At lock time — fully automatic">
        <p>
          When the main card's start time hits, picks lock and buy-ins get charged on their own —
          no button, nothing to click. If it seems late, it's almost always GitHub's own scheduler
          running behind (it can lag under load), not something broken here.
        </p>
      </Section>

      <Section emoji="🥊" title="During the card — after each fight ends">
        <p>Two ways to get a result in, per bout, on the event detail page:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-text">Check ESPN now</strong> (top of the page) — pulls
            whatever ESPN has reported so far and shows you a preview before writing anything.
            Tap it again any time; it only ever adds genuinely new results, never touches one you
            entered by hand.
          </li>
          <li>
            <strong className="text-text">Enter it yourself</strong> on that bout's card — Winner,
            Method, Round/Time. Use this if ESPN is slow, wrong, or you just watched it happen
            and don't want to wait.
          </li>
        </ul>
        <p>
          <strong className="text-text">First Blood is manual-only, always</strong> — ESPN never
          reports it. If an event has the prop enabled, that bout's result card has an A/B/None
          field; nothing will ever fill it in for you.
        </p>
        <p>
          After a result lands (either way), tap <strong className="text-text">Rescore now</strong>{' '}
          to push the updated leaderboard out to everyone's Live tab. Results alone don't update
          the leaderboard — rescoring is what actually does that.
        </p>
      </Section>

      <Section emoji="🏁" title="After the last fight">
        <p>
          Once every main-card bout has a result, tap <strong className="text-text">Finalize
          now</strong>. This pays out the pot, locks in season standings, head-to-head records, and
          badges. It's a one-way door — you have to type FINALIZE to confirm, and it can't be
          undone or re-run.
        </p>
        <p>
          If first blood is enabled, finalize waits up to 12 hours after the last result for you to
          enter it before scoring that prop as a miss for everyone — so don't forget it if it
          matters to the group.
        </p>
      </Section>

      <Section emoji="⚠️" title="If a card falls apart">
        <p>
          <strong className="text-text">Cancel event</strong> on the same page refunds every paid
          entrant in full. Works any time before finalize. Can't be undone either.
        </p>
      </Section>

      <Section emoji="💰" title="Ongoing — not tied to any one event">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-text">/admin/people → Invites</strong> — add a friend's email
            to let them join. They still have to actually sign up themselves.
          </li>
          <li>
            <strong className="text-text">/admin/tokens</strong> — approve or deny token top-up
            requests from players who've run dry.
          </li>
          <li>
            <strong className="text-text">/admin/people → Post pending starting grants</strong> —
            new players don't get their starting balance until you post it here.
          </li>
        </ul>
      </Section>

      <Section emoji="📊" title="What Standings is supposed to show">
        <p>
          Season-long, across every event that's been finalized this calendar year — resets to zero
          each January. Ranked by total points (the sum of every finalized event's score). Each row
          also shows:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-text">Events</strong> — how many they've entered</li>
          <li><strong className="text-text">Wins</strong> — events they finished rank 1 in</li>
          <li><strong className="text-text">Podiums</strong> — events they finished top 3 in</li>
          <li>
            <strong className="text-text">Net tokens</strong> (shown under the points, green/red) —
            lifetime payouts minus buy-ins, their actual token profit or loss
          </li>
        </ul>
        <p>
          It updates itself the moment you finalize an event — nothing to do here. If a row looks
          wrong, the event behind it probably needs a rescore before its next finalize, not a fix
          to Standings directly.
        </p>
      </Section>
    </div>
  );
}
