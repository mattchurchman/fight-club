import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
