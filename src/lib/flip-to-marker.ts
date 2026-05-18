// PlaceCard → 지도 마커 FLIP 전환.
// 카드 클릭 시 카드의 현재 화면 위치에서 시작해 지도 마커 위치로 축소·이동하며 페이드.
// 이 패널이 안 보이거나(모바일 단일 패널) projector 가 미등록(아직 지도 init 안 됨)이면 no-op.

import { gsap, prefersReducedMotion } from './gsap-setup';
import { useMapStore } from '@/stores/mapStore';
import type { Place } from '@/types';

export function flipToMarker(place: Place, fromEl: HTMLElement) {
  if (prefersReducedMotion()) return;
  if (typeof document === 'undefined') return;

  const { projector, mapContainerEl } = useMapStore.getState();
  if (!mapContainerEl) return; // 지도 패널이 화면에 없음 (모바일 단일 패널 등).

  const containerRect = mapContainerEl.getBoundingClientRect();
  if (containerRect.width === 0 || containerRect.height === 0) return;
  const containerCenter = {
    x: containerRect.left + containerRect.width / 2,
    y: containerRect.top + containerRect.height / 2,
  };

  // 마커의 현재 화면 위치(projector). 화면 안에 있으면 정확한 좌표 사용,
  // 아니면 컨테이너 중심 사용 (selectPlace 가 곧 그 위치로 pan 시킬 것).
  const projected = projector?.(place.lat, place.lng);
  const inView = projected
    && projected.x >= containerRect.left && projected.x <= containerRect.right
    && projected.y >= containerRect.top && projected.y <= containerRect.bottom;
  const target = inView && projected ? projected : containerCenter;

  const fromRect = fromEl.getBoundingClientRect();
  if (fromRect.width === 0 || fromRect.height === 0) return;

  // 카드와 마커 위치가 너무 가까우면(같은 패널 내) 모션이 무의미. skip.
  const dx = target.x - (fromRect.left + fromRect.width / 2);
  const dy = target.y - (fromRect.top + fromRect.height / 2);
  if (Math.hypot(dx, dy) < 80) return;

  const clone = document.createElement('div');
  const bg = place.image ? `url(${place.image})` : '';
  Object.assign(clone.style, {
    position: 'fixed',
    top: `${fromRect.top}px`,
    left: `${fromRect.left}px`,
    width: `${fromRect.width}px`,
    height: `${fromRect.height}px`,
    backgroundImage: bg,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    zIndex: '9999',
    overflow: 'hidden',
    willChange: 'transform, opacity',
    opacity: '0.95',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(clone);

  // 카드 → 마커: top/left 로 직접 가는 대신 transform 으로 이동·축소 (GPU).
  // 시작 transform 0,0 → 목표 transform 으로 보간.
  const finalSize = 44; // 마커 원의 시각적 크기
  const finalX = target.x - finalSize / 2 - fromRect.left;
  const finalY = target.y - finalSize / 2 - fromRect.top;
  const scaleX = finalSize / fromRect.width;
  const scaleY = finalSize / fromRect.height;

  gsap.to(clone, {
    x: finalX,
    y: finalY,
    scaleX,
    scaleY,
    opacity: 0,
    borderRadius: '999px',
    duration: 0.65,
    ease: 'power2.inOut',
    transformOrigin: 'top left',
    onComplete: () => {
      clone.remove();
    },
  });
}
