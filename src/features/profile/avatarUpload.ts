// Client-side avatar encoding (docs/tasks/T51). No Cloud Storage (AGENTS.md §2 — Spark plan only),
// so the result is a data URI small enough to live on `users/{uid}.photoURL` in Firestore.

/** Firestore cap on `photoURL` (see `firestore.rules`'s `profileEditOk`), also enforced here so a
 * failed encode never reaches a write. */
export const MAX_AVATAR_CHARS = 30000;

/** Max source file size, checked before decoding anything. */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

const AVATAR_SIZE = 256;
const QUALITIES = [0.8, 0.6, 0.45] as const;

export class AvatarUploadError extends Error {}

export interface DrawBox {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

/**
 * Centre-crop geometry for a `width`×`height` source drawn into an `AVATAR_SIZE`×`AVATAR_SIZE`
 * square (cover, not stretch) — pure so it's unit-testable without a DOM or a real image.
 */
export function planAvatarEncode(width: number, height: number): DrawBox {
  const side = Math.min(width, height);
  return {
    sx: (width - side) / 2,
    sy: (height - side) / 2,
    sWidth: side,
    sHeight: side,
  };
}

/**
 * Downscales `file` to a 256×256 centre-cropped WebP data URI, retrying at lower quality until it
 * fits under `MAX_AVATAR_CHARS`. Throws `AvatarUploadError` with a user-facing message on any
 * failure (wrong type, too large, can't be squeezed small enough) and never writes a partial result.
 */
export async function encodeAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new AvatarUploadError('Please choose an image file.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new AvatarUploadError('That image is too large (max 10 MB).');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new AvatarUploadError("Couldn't read that image. Try a different file.");
  });

  const box = planAvatarEncode(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AvatarUploadError("Couldn't process that image. Try a different file.");
  ctx.drawImage(bitmap, box.sx, box.sy, box.sWidth, box.sHeight, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  for (const quality of QUALITIES) {
    const dataUri = canvas.toDataURL('image/webp', quality);
    if (dataUri.length <= MAX_AVATAR_CHARS) return dataUri;
  }

  throw new AvatarUploadError("That image won't shrink small enough — try a simpler photo.");
}
