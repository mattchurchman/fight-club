// Builds the two `--fixture` files `jobs/lifecycle.ts` expects (see the usage note at the top of
// that file): a site-scoreboard shape for `competitors[].winner`, and a competition-id -> status
// map for `status.result`. The docs/README fixtures under `fixtures/espn/` are UFC 331 (different
// event, different bout ids), so the e2e spec builds its own from the seeded event's own bouts.
import { mkdir, writeFile } from 'node:fs/promises';

interface SeededBout {
  boutId: string;
  competitionId: string;
}

const GENERATED_DIR = new URL('./.generated/', import.meta.url);

/** An empty status map: `applyResults` finds no result for any bout, so the run only locks. */
export async function writeNoResultsFixture(): Promise<string> {
  await mkdir(GENERATED_DIR, { recursive: true });
  const path = new URL('./.generated/no-results.json', import.meta.url);
  await writeFile(path, '{}');
  return path.pathname;
}

/** Corner A wins every main-card bout by KO/TKO (`RESULT_TABLE.kotko` in `jobs/lib/espn.ts`). */
export async function writeAllCornerAWinsFixtures(
  espnEventId: string,
  mainCard: SeededBout[],
): Promise<{ scoreboardPath: string; statusPath: string }> {
  await mkdir(GENERATED_DIR, { recursive: true });

  const scoreboard = {
    events: [
      {
        id: espnEventId,
        competitions: mainCard.map(({ competitionId }) => ({
          id: competitionId,
          competitors: [
            { order: 1, winner: true },
            { order: 2, winner: false },
          ],
        })),
      },
    ],
  };

  const statuses: Record<string, { period: number; displayClock: string; result: { id: number; name: string } }> =
    {};
  for (const { competitionId } of mainCard) {
    statuses[competitionId] = { period: 1, displayClock: '2:14', result: { id: 1, name: 'kotko' } };
  }

  const scoreboardPath = new URL('./.generated/results-scoreboard.json', import.meta.url);
  const statusPath = new URL('./.generated/results-status.json', import.meta.url);
  await writeFile(scoreboardPath, JSON.stringify(scoreboard, null, 2));
  await writeFile(statusPath, JSON.stringify(statuses, null, 2));
  return { scoreboardPath: scoreboardPath.pathname, statusPath: statusPath.pathname };
}
