import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
        <p>Pick the winner wrong and that fight scores zero (or a Lock penalty, see above). Pick the
          winner right, and up to two things add to your score:
        </p>
        <p>
          <strong className="text-text">1. Base points</strong> — your stake × that fighter's odds. A
          bigger underdog pays more. Bet 200 on a fighter at +150 and win: 200 × 2.5 ={' '}
          <strong className="text-win">500 points</strong>.
        </p>
        <p>
          <strong className="text-text">2. Method bonus</strong> — only if you <em>also</em> called the
          finish correctly, worth a fraction of your stake on top:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Submission correct: <strong className="text-text">+100%</strong> of your stake</li>
          <li>KO/TKO correct: <strong className="text-text">+75%</strong> of your stake</li>
          <li>Decision correct: <strong className="text-text">+50%</strong> of your stake</li>
        </ul>
        <p>
          So that same 200-stake, +150 pick: if it also won by submission, you'd add another 200 points
          (100% of the 200 stake) for <strong className="text-win">700 total</strong> on that fight. Get
          the winner right but the method wrong (or it ends in a DQ/no-contest-style oddity) and you just
          keep the base 500 — no bonus, no penalty.
        </p>
      </Section>

      <Section emoji="💵" title="Payouts — it's not always winner-take-all">
        <p>
          The pot is everyone's buy-ins added together. How it splits depends on how many people paid
          in, not just first place:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>2–3 players: 1st place takes <strong className="text-text">100%</strong></li>
          <li>4–6 players: <strong className="text-text">70%</strong> to 1st, <strong className="text-text">30%</strong> to 2nd</li>
          <li>7+ players: <strong className="text-text">60% / 30% / 10%</strong> to 1st / 2nd / 3rd</li>
          <li>Just 1 player entered: everyone gets refunded, no pot</li>
        </ul>
        <p>
          Tied for a payout spot? Those players pool every place they're tied for and split it evenly.
          Payouts post the moment an admin finalizes the event — there's no separate claim step.
        </p>
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

      <Section emoji="📲" title="Yes, you can install this as an app">
        <p>
          It's a real installable app (a PWA) — no App Store needed. Installed, it opens full-screen
          like any other app and can send you push notifications.
        </p>
        <p>
          <strong className="text-text">On iPhone:</strong> open this site in Safari (it has to be
          Safari, not Chrome), tap the Share icon, then{' '}
          <strong className="text-text">Add to Home Screen</strong>.
        </p>
        <p>
          <strong className="text-text">On Android:</strong> open this site in Chrome, then use the
          browser menu's <strong className="text-text">Install app</strong> option.
        </p>
        <Link to="/install" className="font-semibold text-gold underline underline-offset-2">
          Full install steps →
        </Link>
      </Section>
    </div>
  );
}
