// Invite management (docs/tasks/T17 step 3). `allowlist/{emailLower}` is a full admin write per
// firestore.rules, so create/revoke are plain `setDoc`/`deleteDoc` — no transaction needed.
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Role } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';

export async function createInvite(email: string, role: Role, startingGrant: number, invitedBy: string): Promise<void> {
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) throw new Error('Email is required');

  await setDoc(doc(db, 'allowlist', emailLower), {
    email: emailLower,
    role,
    startingGrant,
    invitedBy,
    invitedAt: serverTimestamp(),
    claimedBy: null,
    claimedAt: null,
  });
}

export async function revokeInvite(emailLower: string): Promise<void> {
  await deleteDoc(doc(db, 'allowlist', emailLower));
}
