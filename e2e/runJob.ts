// Shells out to a `jobs/*.ts` script against the running emulators — used by the e2e spec to
// stand in for time passing (lock, results, finalize) that a real browser test can't wait out.
import './emulatorEnv.ts';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

export function runLifecycle(args: readonly string[]): string {
  return execFileSync('npx', ['tsx', 'jobs/lifecycle.ts', ...args], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8',
  });
}
