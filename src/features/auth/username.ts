// Username rules per docs/tasks/T12: 3-20 chars, [a-z0-9_], stored lowercase (username ==
// usernameLower keeps the firestore.rules invariant `usernameLower == username.lower()` trivial).
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns a user-facing error, or null when the format is valid. Doesn't check availability. */
export function usernameFormatError(raw: string): string | null {
  const value = normalizeUsername(raw);
  if (value.length < USERNAME_MIN) return `Must be at least ${USERNAME_MIN} characters.`;
  if (value.length > USERNAME_MAX) return `Must be at most ${USERNAME_MAX} characters.`;
  if (!USERNAME_PATTERN.test(value)) return 'Only lowercase letters, numbers and underscore.';
  return null;
}
