import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// The source icon.svg already fills its full canvas with the brand background and leaves its
// own safe-zone margin around the mark, so the generator's default 30%-white-padding box (meant
// for logos with transparent backgrounds) just adds an unwanted white border — most visible as a
// ring around the icon on the iOS home screen, which doesn't bleed to the edge like Apple expects.
const BRAND_BG = '#0B0B0D';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    apple: { sizes: [180], padding: 0, resizeOptions: { fit: 'contain', background: BRAND_BG } },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { fit: 'contain', background: BRAND_BG },
    },
  },
  images: ['public/icon.svg'],
});
