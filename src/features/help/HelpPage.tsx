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

/** `/help`: a plain-language explainer for first-time players. Always reachable from the header. */
export function HelpPage() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="px-1 text-sm text-muted">
        The short version: pick winners, spend a budget of points per fight, and see who scores the
        most once the card locks.
      </p>

      <Section emoji="🥊" title="Making picks">
        <p>
          On the <strong className="text-text">Fights</strong> tab, pick a winner, a method (KO, SUB,
          or DEC), and a stake for every main-card bout.
        </p>
        <p>
          You have a fixed budget of points to split across all the fights (usually{' '}
          <strong className="text-text">1000</strong>, in chunks of 25, 50–400 per fight) — bet more on
          picks you're confident in. The app won't let you submit until your stakes add up exactly
          right.
        </p>
        <p>You can change your picks as many times as you want, right up until the card locks.</p>
      </Section>

      <Section emoji="🔒" title="Lock of the Night">
        <p>
          Tap <strong className="text-text">🔒 Lock</strong> on one bout to make it your Lock of the
          Night — every entry needs exactly one.
        </p>
        <p>
          It's a double-or-nothing bet: get it right and that fight's score is{' '}
          <strong className="text-win">doubled</strong>. Get it wrong and you lose{' '}
          <strong className="text-loss">half your stake</strong> on that fight — not just zero. Pick
          your safest bet, not your riskiest.
        </p>
      </Section>

      <Section emoji="🩸" title="First Blood">
        <p>
          Some events add a First Blood prop: guess which fighter draws first blood, in any one fight
          you choose — independent of who actually wins it. Right guess is a flat{' '}
          <strong className="text-win">+100</strong> bonus. Only shown when the admin turns it on for
          that event.
        </p>
      </Section>

      <Section emoji="🏆" title="How scoring works">
        <p>Three things add up on every fight you pick correctly:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your stake, multiplied by that fighter's odds — a bigger underdog pays more.</li>
          <li>A method bonus if you also called KO, SUB, or DEC correctly.</li>
          <li>Double points if it was your Lock.</li>
        </ul>
        <p>Pick the winner wrong and that fight scores zero (or a Lock penalty, see above).</p>
      </Section>

      <Section emoji="📡" title="When picks lock & how results show up">
        <p>
          Picks lock automatically the moment the first main-card fight starts — no manual action
          needed, and no edits after that.
        </p>
        <p>
          From then on, check the <strong className="text-text">Live</strong> tab: it shows everyone's
          picks and a running leaderboard that updates automatically as results come in, fight by
          fight. Nobody can see anyone's picks — including their own locked-in view — before the card
          locks.
        </p>
      </Section>

      <Section emoji="💰" title="Tokens vs. points — don't mix them up">
        <p>
          <strong className="text-text">Tokens</strong> are your real wallet balance — they carry over
          between events, pay your buy-in, and are what you actually win or lose.
        </p>
        <p>
          <strong className="text-text">Points</strong> are just the per-event budget you spend on
          picks — they reset every event and only exist to measure your score that night.
        </p>
        <p>
          Running low on tokens? Request more from the{' '}
          <strong className="text-text">Wallet</strong> tab — an admin approves it.
        </p>
      </Section>

      <Section emoji="📊" title="Standings & Head-to-Head">
        <p>
          <strong className="text-text">Standings</strong> tracks the whole group across the season —
          total points, wins, podiums.
        </p>
        <p>
          Every player's profile also has a{' '}
          <strong className="text-text">Head-to-Head</strong> record against everyone else — whoever
          scores higher in an event you both entered gets the win, shown as "7–3 vs. Dave."
        </p>
      </Section>

      <Section emoji="💬" title="Trash talk">
        <p>
          The Live tab has a chat panel for the group — post messages, tag a specific fight, or just
          drop a quick 🔥 😂 🩸 💀 🐐 reaction. Your own messages can be deleted if you change your mind.
        </p>
      </Section>
    </div>
  );
}
