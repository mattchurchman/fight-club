import { expect, type Page } from '@playwright/test';

/** Assert that neither the document nor the app's main content overflows the viewport horizontally. */
export async function expectFitsWidth(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const viewportWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const mainWidth = document.querySelector('main')?.scrollWidth ?? 0;
    let widest: { overflow: number; element: string } | null = null;

    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      const rect = element.getBoundingClientRect();
      const overflow = Math.max(rect.right - viewportWidth, -rect.left, element.scrollWidth - element.clientWidth);
      if (overflow > (widest?.overflow ?? 0)) {
        const classes = [...element.classList].slice(0, 4).join('.');
        widest = {
          overflow: Math.ceil(overflow),
          element: `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`,
        };
      }
    }

    return { viewportWidth, documentWidth, mainWidth, widest };
  });

  const actualWidth = Math.max(result.documentWidth, result.mainWidth);
  const offender = result.widest
    ? ` Widest offender: ${result.widest.element} (+${result.widest.overflow}px).`
    : '';
  expect(
    actualWidth,
    `Horizontal overflow: document=${result.documentWidth}px, main=${result.mainWidth}px, viewport=${result.viewportWidth}px.${offender}`,
  ).toBeLessThanOrEqual(result.viewportWidth);
}
