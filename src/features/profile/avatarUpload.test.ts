// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeAvatar, MAX_AVATAR_CHARS, planAvatarEncode } from './avatarUpload.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('planAvatarEncode', () => {
  it('centre-crops a square draw box out of a wider-than-tall source', () => {
    expect(planAvatarEncode(400, 200)).toEqual({ sx: 100, sy: 0, sWidth: 200, sHeight: 200 });
  });

  it('centre-crops a square draw box out of a taller-than-wide source', () => {
    expect(planAvatarEncode(200, 400)).toEqual({ sx: 0, sy: 100, sWidth: 200, sHeight: 200 });
  });

  it('is a no-op crop for an already-square source', () => {
    expect(planAvatarEncode(300, 300)).toEqual({ sx: 0, sy: 0, sWidth: 300, sHeight: 300 });
  });
});

describe('MAX_AVATAR_CHARS', () => {
  it('matches the Firestore rules cap on photoURL', () => {
    expect(MAX_AVATAR_CHARS).toBe(30000);
  });
});

describe('encodeAvatar', () => {
  it('falls back to JPEG when the browser returns PNG for a WebP request', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 400, height: 300, close }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockImplementation((type) => {
        if (type === 'image/webp') return `data:image/png;base64,${'x'.repeat(MAX_AVATAR_CHARS)}`;
        return 'data:image/jpeg;base64,small';
      });

    const result = await encodeAvatar(new File(['photo'], 'photo.heic', { type: 'image/heic' }));

    expect(result).toBe('data:image/jpeg;base64,small');
    expect(toDataURL).toHaveBeenNthCalledWith(1, 'image/webp', 0.8);
    expect(toDataURL).toHaveBeenNthCalledWith(2, 'image/jpeg', 0.8);
    expect(close).toHaveBeenCalledOnce();
  });
});
