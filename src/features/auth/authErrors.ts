// Friendly copy for Firebase Auth error codes (e.g. "auth/wrong-password").
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/missing-email': 'Enter your email first.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists with that email.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
};

const FALLBACK = 'Something went wrong. Please try again.';

export function mapAuthError(code: string | undefined | null): string {
  if (!code) return FALLBACK;
  return MESSAGES[code] ?? FALLBACK;
}
