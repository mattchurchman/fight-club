import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, PLAYER_EMAIL, PLAYER_PASSWORD } from './testUsers.ts';
import { writeAllCornerAWinsFixtures, writeNoResultsFixture } from './resultFixtures.ts';
import { runLifecycle } from './runJob.ts';

interface SeedData {
  eventId: string;
  espnEventId: string;
  lockAtMillis: number;
  mainCard: { boutId: string; competitionId: string }[];
}

function readSeed(): SeedData {
  const path = fileURLToPath(new URL('./.generated/seed.json', import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as SeedData;
}

const PLAYER_USERNAME = 'e2eplayer';
const PLAYER_DISPLAY_NAME = 'E2E Player';

test('admin invites a player; they pick, lock, score and get paid', async ({ browser }) => {
  test.setTimeout(180_000);
  const seed = readSeed();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto('/login');
  await adminPage.getByLabel('Email').fill(ADMIN_EMAIL);
  await adminPage.getByLabel('Password').fill(ADMIN_PASSWORD);
  await adminPage.getByRole('button', { name: 'Sign in' }).click();
  await expect(adminPage.getByRole('link', { name: 'Wallet' })).toBeVisible();

  await test.step('admin invites the player', async () => {
    await adminPage.goto('/admin/people');
    await adminPage.locator('#invite-email').fill(PLAYER_EMAIL);
    await adminPage.getByRole('button', { name: 'Send invite' }).click();
    await expect(adminPage.getByText(PLAYER_EMAIL)).toBeVisible();
  });

  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();

  await test.step('player signs up and onboards', async () => {
    await playerPage.goto('/login');
    await playerPage.getByRole('button', { name: 'Need an account?' }).click();
    await playerPage.getByLabel('Email').fill(PLAYER_EMAIL);
    await playerPage.getByLabel('Password').fill(PLAYER_PASSWORD);
    await playerPage.getByRole('button', { name: 'Create account' }).click();

    await expect(playerPage.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
    await playerPage.getByLabel('Username').fill(PLAYER_USERNAME);
    await playerPage.getByLabel('Display name').fill(PLAYER_DISPLAY_NAME);
    await expect(playerPage.getByText('Available!')).toBeVisible();
    await playerPage.getByRole('button', { name: 'Enter Fight Club' }).click();
    await expect(playerPage.getByRole('link', { name: 'Wallet' })).toBeVisible();
  });

  await test.step('starting grant is posted', async () => {
    runLifecycle(['--live']);
    await playerPage.goto('/wallet');
    await expect(playerPage.getByText("You're broke. Beg the admin.")).toHaveCount(0);
  });

  await test.step('player makes picks', async () => {
    await playerPage.goto('/');
    await playerPage.getByRole('button', { name: 'Make your picks' }).click();

    // The deck renders every fight slide at once (horizontally snapped) plus a review slide;
    // scope each lookup to the current slide so later fights' same-named buttons aren't matched.
    const slides = playerPage.locator('.snap-center');
    for (let i = 0; i < seed.mainCard.length; i++) {
      const slide = slides.nth(i);
      // Fighter A (red corner) is always the first "Pick …" button in the slide.
      await slide.locator('button[aria-label^="Pick "]').first().click();
      await slide.getByRole('button', { name: 'KO', exact: true }).click();
      // 200 × 5 main-card bouts == the 1000-point budget (shared/constants.ts DEFAULTS.budget),
      // so Auto-balance below is a no-op and the entry is ready to submit as soon as it's picked.
      await slide.getByRole('button', { name: '200', exact: true }).click();
      const isLast = i === seed.mainCard.length - 1;
      await slide.getByRole('button', { name: isLast ? 'Review picks →' : 'Next fight →' }).click();
    }

    // Fight slides stay mounted off-screen, each with its own "Make this my lock" button, so
    // scope the lock click to the review row's aria-label (`Lock <fighter>`) to avoid matching those.
    const reviewSlide = slides.nth(seed.mainCard.length);
    await reviewSlide.getByRole('button', { name: /^Lock /, exact: false }).first().click();
    // First-blood bout chips are the only buttons whose label is "<fighter A> / <fighter B>".
    await reviewSlide.getByRole('button', { name: / \/ /, exact: false }).first().click();

    await reviewSlide.getByRole('button', { name: 'Auto-balance' }).click();
    await reviewSlide.getByRole('button', { name: 'Submit picks' }).click();
    await expect(playerPage.getByText('Picks in. Good luck.')).toBeVisible();
  });

  const lockNowIso = new Date(seed.lockAtMillis + 60_000).toISOString();
  // `applyFinalize` blocks for FIRST_BLOOD_GRACE_MS (12h, shared/lifecycle/finalize.ts) after the
  // last result lands — ESPN never reports first blood, so every event waits it out. `--now`
  // lets this run simulate that wait instantly instead of a real 12h sleep.
  const finalizeNowIso = new Date(seed.lockAtMillis + 60_000 + 12 * 60 * 60 * 1000 + 60_000).toISOString();

  await test.step('lifecycle job locks the event; reveal is visible', async () => {
    const noResultsFixture = await writeNoResultsFixture();
    runLifecycle(['--live', '--now', lockNowIso, '--fixture', noResultsFixture]);

    await playerPage.goto('/live');
    await expect(playerPage.getByText('Picks lock in')).toHaveCount(0);
    // exact + first(): In the Cage's PickerRow (T47) and the leaderboard row both show the name now.
    await expect(playerPage.getByText(PLAYER_DISPLAY_NAME, { exact: true }).first()).toBeVisible();
  });

  const { scoreboardPath, statusPath } = await writeAllCornerAWinsFixtures(seed.espnEventId, seed.mainCard);

  await test.step('results fixture applied; leaderboard shows the score', async () => {
    runLifecycle(['--live', '--now', lockNowIso, '--fixture', scoreboardPath, '--fixture', statusPath]);

    await playerPage.goto('/live');
    await expect(playerPage.getByText(PLAYER_DISPLAY_NAME, { exact: true }).first()).toBeVisible();
    await expect(playerPage.getByText(/^\+\d+$/)).toBeVisible();
  });

  await test.step('finalize posts the payout', async () => {
    // Same fixtures, a `--now` past the first-blood grace: results are already `final` (this
    // run's `applyResults` is a no-op), so only `applyFinalize`'s own re-check moves.
    runLifecycle(['--live', '--now', finalizeNowIso, '--fixture', scoreboardPath, '--fixture', statusPath]);

    await playerPage.goto('/wallet');
    await expect(playerPage.getByText(/Payout|Refund/)).toBeVisible();
  });
});
