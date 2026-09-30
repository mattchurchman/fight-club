import { defineConfig } from 'vitest/config';

// Firestore rules tests. These need the emulator, so they run only via `npm run test:rules`
// (which wraps them in `firebase emulators:exec`) and are excluded from `npm test`.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    // One emulator, one rules environment: files clear Firestore between tests, so they
    // must not run concurrently.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
