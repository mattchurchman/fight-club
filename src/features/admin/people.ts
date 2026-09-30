// Grant/deduct and role changes (docs/tasks/T17 step 4).
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { postLedgerRow } from './postLedger.ts';

/** A positive `amount` grants, a negative one deducts — both are `adjust` rows (ad-hoc, random id). */
export async function adjustBalance(uid: string, amount: number, note: string, adminUid: string): Promise<void> {
  if (amount === 0) throw new Error('Amount must not be zero');
  await postLedgerRow({ uid, amount, type: 'adjust', scope: null, note: note || null, createdBy: adminUid });
}

/**
 * Admin identity is `config/app.admins` (see firestore.rules), not `users.role` — `role` is display
 * metadata, updated alongside it so the profile UI matches.
 */
export async function makeAdmin(uid: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'config', 'app'), { admins: arrayUnion(uid) }),
    updateDoc(doc(db, 'users', uid), { role: 'admin' }),
  ]);
}
