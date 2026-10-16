import { describe, expect, it } from 'vitest';
import { MAX_AVATAR_CHARS, planAvatarEncode } from './avatarUpload.ts';

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
