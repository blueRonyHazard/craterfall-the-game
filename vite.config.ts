import { defineConfig } from 'vitest/config';

/**
 * BASE_PATH controls the public path the app is served from.
 * - Local dev / preview: '/' (default)
 * - GitHub Pages project site: '/<repository-name>/' (set by .github/workflows/deploy.yml)
 */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
    // Phaser alone is ~1.2 MB minified; keep it in its own long-cacheable chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
