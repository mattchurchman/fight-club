import { Timestamp } from 'firebase-admin/firestore';
import type { JobRun } from '@shared/index.ts';
import { getAdmin } from './admin.ts';

function line(
  level: 'info' | 'warn' | 'error',
  name: string,
  message: string,
  extra?: unknown,
): void {
  const entry = {
    level,
    job: name,
    message,
    ...(extra !== undefined ? { extra } : {}),
    time: new Date().toISOString(),
  };
  console[level === 'info' ? 'log' : level](JSON.stringify(entry));
}

export const log = {
  info: (name: string, message: string, extra?: unknown) => line('info', name, message, extra),
  warn: (name: string, message: string, extra?: unknown) => line('warn', name, message, extra),
  error: (name: string, message: string, extra?: unknown) => line('error', name, message, extra),
};

/** Writes `jobRuns/{name}` (docs/DATA_MODEL.md) so admins can see each job's last outcome. */
export async function recordJobRun(
  name: string,
  ok: boolean,
  summary: string,
  error?: string,
): Promise<void> {
  const { db } = getAdmin();
  const run: JobRun<Timestamp> = {
    lastRunAt: Timestamp.now(),
    ok,
    summary,
    error: error ?? null,
  };
  await db.collection('jobRuns').doc(name).set(run);
}
