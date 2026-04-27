import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Pre-bundle everything commonly imported. Vite serves each module via
    // native ESM in dev — libs that ship hundreds of tiny files (three,
    // google maps loader) become hundreds of network requests unless
    // they're pre-bundled into a single chunk here.
    include: [
      'react',
      'react-dom/client',
      'zustand',
      'lucide-react',
      '@googlemaps/js-api-loader',
      '@chenglou/pretext',
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
    ],
  },
  server: {
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/components/chat/ChatMessages.tsx',
        './src/components/chat/ChatInput.tsx',
        './src/components/chat/MessageBubble.tsx',
        './src/components/chat/PlaceCarousel.tsx',
      ],
    },
    // Watcher blacklist. Vite's chokidar watches the project root by
    // default — a leftover .next/ (344MB, 2k+ files) or dist/ can add
    // minutes to startup as each file gets a watch descriptor. macOS
    // fseventsd suffers the same way. Ignore any build/cache directory.
    watch: {
      ignored: [
        '**/.next/**',
        '**/dist/**',
        '**/.git/**',
        '**/coverage/**',
        '**/.omc/**',
      ],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
