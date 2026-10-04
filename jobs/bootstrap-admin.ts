// docs/tasks/T12-auth-invites-onboarding.md — makes an email an admin, from the terminal.
// Usage: npm run bootstrap:admin -- you@example.com
// Idempotent: safe to rerun. If the person hasn't signed in yet, allowlists them as admin and
// asks you to rerun once they have (we need their uid for config/app.admins and users/{uid}).
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULTS, RULES_VERSION } from '@shared/index.ts';
import { getAdmin } from './lib/admin.ts';

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run bootstrap:admin -- you@example.com');
    process.exitCode = 1;
    return;
  }

  const { db, auth } = getAdmin();

  // docs/SETUP.md never had a step that seeds config/app beyond `admins` for a real (non-emulator)
  // project — only jobs/seed-emulator.ts did this, for the emulator only. Found live: a real
  // deployment's config/app had nothing but `admins`, which crashes Finalize (it needs
  // config/app.seasonId to load season standings). Fill in only what's missing, never overwrite a
  // value someone deliberately changed later (e.g. rolled seasonId to a new year).
  const appConfigRef = db.collection('config').doc('app');
  const appConfig = (await appConfigRef.get()).data();
  const appConfigPatch: Record<string, unknown> = {};
  if (appConfig?.seasonId === undefined) appConfigPatch.seasonId = new Date().getFullYear().toString();
  if (appConfig?.defaults === undefined) appConfigPatch.defaults = DEFAULTS;
  if (appConfig?.autoEnableNumbered === undefined) appConfigPatch.autoEnableNumbered = true;
  if (appConfig?.rulesVersion === undefined) appConfigPatch.rulesVersion = RULES_VERSION;
  if (Object.keys(appConfigPatch).length > 0) {
    await appConfigRef.set(appConfigPatch, { merge: true });
    console.log(`config/app -> filled in missing field(s): ${Object.keys(appConfigPatch).join(', ')}`);
  }

  const allowlistRef = db.collection('allowlist').doc(email);
  const existing = (await allowlistRef.get()).data();
  await allowlistRef.set(
    {
      email,
      role: 'admin',
      startingGrant: existing?.startingGrant ?? DEFAULTS.startingGrant,
      invitedBy: existing?.invitedBy ?? 'bootstrap',
      invitedAt: existing?.invitedAt ?? FieldValue.serverTimestamp(),
      claimedBy: existing?.claimedBy ?? null,
      claimedAt: existing?.claimedAt ?? null,
    },
    { merge: true },
  );
  console.log(`allowlist/${email} -> role: admin`);

  const authUser = await auth.getUserByEmail(email).catch(() => null);
  if (!authUser) {
    console.log(`${email} hasn't signed in yet. Sign in once, then rerun this command.`);
    return;
  }

  await db
    .collection('config')
    .doc('app')
    .set({ admins: FieldValue.arrayUnion(authUser.uid) }, { merge: true });
  console.log(`config/app.admins -> includes ${authUser.uid}`);

  const userRef = db.collection('users').doc(authUser.uid);
  if ((await userRef.get()).exists) {
    await userRef.set({ role: 'admin' }, { merge: true });
    console.log(`users/${authUser.uid}.role -> admin`);
  } else {
    // Their own onboarding write always sets role: 'player' (firestore.rules), which is fine —
    // isAdmin() only ever consults config/app.admins, never users.role (display metadata only).
    console.log(`${email} hasn't onboarded yet; users/${authUser.uid}.role will read "player" ` +
      'until they do. They already have admin access via config/app.admins.');
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
