import { toPng } from 'html-to-image';

// Captures an offscreen poster node to PNG and hands it to the share sheet, or downloads it
// when Web Share isn't available (desktop browsers) (docs/tasks/T22).

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface SharePosterOptions {
  width: number;
  height: number;
  filename: string;
  title: string;
  text?: string;
}

/** Renders `node` to a PNG and shares or downloads it. Throws only if PNG capture itself fails. */
export async function sharePoster(node: HTMLElement, options: SharePosterOptions): Promise<void> {
  const dataUrl = await toPng(node, { width: options.width, height: options.height, pixelRatio: 2 });
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], options.filename, { type: 'image/png' });

  const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  if (canShareFiles && typeof navigator.share === 'function') {
    await navigator.share({ files: [file], title: options.title, text: options.text });
    return;
  }

  downloadBlob(blob, options.filename);
}
