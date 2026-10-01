// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sharePoster } from './sharePoster.ts';

vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,Zm9v') }));

const PNG_BLOB = new Blob(['fake-png'], { type: 'image/png' });

describe('sharePoster', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: () => Promise.resolve(PNG_BLOB) }));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shares via the Web Share API when the browser can share files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      canShare: () => true,
      share,
    });

    const node = document.createElement('div');
    await sharePoster(node, { width: 1080, height: 1350, filename: 'results.png', title: 'Fight Club' });

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fight Club', files: [expect.any(File)] }),
    );
  });

  it('falls back to a download link when Web Share is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined, share: undefined });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const node = document.createElement('div');
    await sharePoster(node, { width: 1080, height: 1350, filename: 'results.png', title: 'Fight Club' });

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledWith(PNG_BLOB);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('falls back to download when canShare rejects this file', async () => {
    const share = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, canShare: () => false, share });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const node = document.createElement('div');
    await sharePoster(node, { width: 1080, height: 1350, filename: 'picks.png', title: 'Fight Club' });

    expect(share).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledOnce();
  });
});
