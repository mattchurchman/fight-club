import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: {
        name: 'Fight Club',
        short_name: 'Fight Club',
        description: "Private, invite-only UFC pick'em for one group of friends.",
        theme_color: '#0B0B0D',
        background_color: '#0B0B0D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        // Without this, the SPA fallback hijacks every navigation — including Firebase's own
        // reserved /__/auth/** helper pages (used by signInWithRedirect). The service worker
        // serves our cached index.html instead of letting the request reach the real page, and
        // React Router's catch-all then renders "page not found" for a route it's never heard
        // of — which looks exactly like a 404, but is entirely client-side, on a URL the real
        // server answers correctly (confirmed directly: curl returns Firebase's actual auth
        // helper page, not ours).
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(dirname, 'shared'),
    },
  },
  test: {
    // Default environment is node (shared/**, jobs/**). src/** tests opt into jsdom
    // via a `// @vitest-environment jsdom` docblock (environmentMatchGlobs was removed in Vitest 5).
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
