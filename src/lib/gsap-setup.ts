// GSAP — 진입 시점에 1회 import. main.tsx 에서 로드.
// (ScrollTrigger 는 미사용이라 제거: 전역 scroll/resize 리스너 + 등록 시 layout refresh 가
//  로드 시 강제 reflow 를 유발하고 vendor-gsap 번들을 키웠음. 필요해지면 여기서 register.)

import gsap from 'gsap';

export { gsap };

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
