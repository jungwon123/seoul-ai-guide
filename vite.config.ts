import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// CSS 가 render-blocking 으로 LCP 300-500ms 지연시키는 문제 해소.
// build 시점에 entry HTML 의 <link rel="stylesheet"> 를 preload + onload swap 으로 변환.
// JS-disabled 환경 대비 <noscript> fallback 함께 삽입.
function asyncCssPlugin(): Plugin {
  return {
    name: 'async-css',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"(?:\s+crossorigin)?\s+href="([^"]+)">/g,
        (_m, href: string) =>
          `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${href}"></noscript>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), asyncCssPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 메인 번들에서 큰 vendor 라이브러리들을 별도 chunk 로 분리.
    // 효과: (1) 앱 코드만 변경 시 vendor chunk 는 캐시 재사용 → 재방문 빠름
    //       (2) 메인 index.js 크기 감소 → 초기 파싱/평가 시간 단축
    // ※ Three.js 는 이미 React.lazy 로 동적 import → 자동으로 별도 chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-gsap': ['gsap', '@gsap/react'],
          'vendor-lottie': ['lottie-react'],
          'vendor-google-maps': ['@googlemaps/js-api-loader'],
        },
      },
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
