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
    // BE 연동 — same-origin proxy로 CORS 우회. VITE_API_BASE를 비워두면
    // FE는 localhost:포트/api/v1/... 를 호출하고, vite가 dev BE로 전달한다.
    // VITE_DEV_BE 환경변수로 타겟 변경 가능. 기본은 GCE localbiz-api.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_BE || 'https://34.50.44.75.nip.io',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VITE_DEV_BE || 'https://34.50.44.75.nip.io',
        changeOrigin: true,
      },
      '/shared': {
        target: process.env.VITE_DEV_BE || 'https://34.50.44.75.nip.io',
        changeOrigin: true,
      },
    },
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
