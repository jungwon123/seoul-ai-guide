// GSAP 플러그인 등록 — 진입 시점에 1회. main.tsx 에서 import.
// ScrollTrigger 외에 추가 플러그인이 생기면 여기에 register.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
