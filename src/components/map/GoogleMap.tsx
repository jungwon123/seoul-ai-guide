import { useEffect, useRef, useState, useCallback } from 'react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { loadMaps, loadMarker } from '@/lib/google-maps-loader';
import { useMapStore } from '@/stores/mapStore';

export type DisplayMarker = Place & { isBookmark?: boolean };

export type CongestionPoint = { lat: number; lng: number; color: string; radiusMeters: number };

interface GoogleMapProps {
  markers: DisplayMarker[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  itineraryMode?: boolean;
  congestionPoints?: CongestionPoint[];
  showHeatmap?: boolean;
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

interface MarkerEntry {
  marker: google.maps.marker.AdvancedMarkerElement;
  place: DisplayMarker;
  pinEl: HTMLElement;
  ringEl: HTMLElement;
  labelEl: HTMLElement;
}

function buildMarkerContent(
  place: DisplayMarker,
  index: number,
  itineraryMode: boolean,
  isSelected: boolean,
): { wrapper: HTMLElement; pinEl: HTMLElement; ringEl: HTMLElement; labelEl: HTMLElement } {
  const cat = CATEGORY_CONFIG[place.category];
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';

  const isBookmark = !!place.isBookmark;
  // Itinerary mode → square pin, normal bookmark → square, rest → circle.
  const shape = isBookmark || itineraryMode ? 'border-radius: 12px;' : 'border-radius: 50%;';

  // Top-right badge — priority: itinerary number > bookmark star > none
  let badge = '';
  if (itineraryMode) {
    badge = `<div style="
      position: absolute;
      top: -6px; right: -6px;
      width: 22px; height: 22px;
      background: #1A1A18;
      color: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      border: 2px solid white;
    ">${index + 1}</div>`;
  } else if (isBookmark) {
    badge = `<div style="
      position: absolute;
      top: -6px; right: -6px;
      width: 22px; height: 22px;
      background: #F59E0B;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      border: 2px solid white;
    ">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none">
        <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6l-6.3 4.4L8 13.8 2 9.4h7.6z"/>
      </svg>
    </div>`;
  }

  // In itinerary mode the side panel owns the place names — hide the map
  // label to avoid duplicating information.
  const labelHtml = itineraryMode
    ? ''
    : `<div data-label style="
        color: #1A1A18; font-weight: 600;
        background: white;
        padding: 3px 8px; border-radius: 6px;
        margin-top: 6px; text-align: center;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        transition: font-size 0.15s, border-color 0.15s;
      ">${place.name}</div>`;

  // 도장 찍기 임팩트: pinEl이 위에서 회전하며 내려와 충격, shockwave 링이 퍼짐.
  // stagger로 마커들이 순차적으로 톡톡 찍히게.
  const stampDelay = Math.min(index * 60, 600); // 최대 600ms — 너무 길어지지 않게
  const ringBorderRadius = isBookmark || itineraryMode ? '12px' : '50%';

  wrapper.innerHTML = `
    <div data-ring style="position: relative;">
      <div data-shockwave style="
        position: absolute;
        top: 50%; left: 50%;
        width: 42px; height: 42px;
        border-radius: ${ringBorderRadius};
        border: 2px solid ${cat.color};
        pointer-events: none;
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0;
        animation: stampShockwave 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${stampDelay}ms 1 forwards;
        will-change: transform, opacity;
      "></div>
      <div data-pin style="
        background: ${cat.color};
        ${shape}
        display: flex; align-items: center; justify-content: center;
        font-weight: 700;
        color: white;
        letter-spacing: -0.02em;
        transition: width 0.15s, height 0.15s, font-size 0.15s, box-shadow 0.15s;
        animation:
          stampImpact 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${stampDelay}ms 1 both,
          stampJitter 4.5s ease-in-out ${stampDelay + 650}ms infinite;
        transform-origin: center;
        will-change: transform;
        filter: url(#markerInkBleed);
      ">${cat.label[0]}</div>
      ${badge}
    </div>
    ${labelHtml}
  `;

  const pinEl = wrapper.querySelector('[data-pin]') as HTMLElement;
  const ringEl = wrapper.querySelector('[data-ring]') as HTMLElement;
  const labelEl = (wrapper.querySelector('[data-label]') as HTMLElement | null) ?? pinEl;
  // Apply initial selection style
  applySelectionStyle(pinEl, labelEl, place, isSelected);
  return { wrapper, pinEl, ringEl, labelEl };
}

function applySelectionStyle(
  pinEl: HTMLElement,
  labelEl: HTMLElement,
  place: DisplayMarker,
  isSelected: boolean,
) {
  const cat = CATEGORY_CONFIG[place.category];
  const isBookmark = !!place.isBookmark;
  const size = isSelected ? 52 : 42;
  pinEl.style.width = `${size}px`;
  pinEl.style.height = `${size}px`;
  pinEl.style.fontSize = isSelected ? '16px' : '14px';
  pinEl.style.boxShadow = `0 4px 16px ${cat.color}66, 0 0 0 ${isSelected ? 4 : 3}px white, 0 0 0 ${isSelected ? 5 : 4}px ${cat.color}40`;
  // Skip label-specific styles when the marker has no separate label (itinerary mode
  // passes pinEl as labelEl fallback).
  if (labelEl !== pinEl) {
    labelEl.style.fontSize = '12px';
    labelEl.style.border = `1px solid ${isBookmark ? '#F59E0B40' : `${cat.color}20`}`;
  }
}

export default function GoogleMap({
  markers,
  selectedPlace,
  onSelectPlace,
  itineraryMode = false,
  congestionPoints,
  showHeatmap = false,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const entriesRef = useRef<Map<string, MarkerEntry>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelectPlace);
  const [mapReady, setMapReady] = useState(false);

  // Keep latest callback in ref so marker click handlers stay stable
  useEffect(() => { onSelectRef.current = onSelectPlace; }, [onSelectPlace]);
  useEffect(() => { selectedIdRef.current = selectedPlace?.id ?? null; }, [selectedPlace]);

  const clearOverlays = useCallback(() => {
    entriesRef.current.forEach(({ marker }) => { marker.map = null; });
    entriesRef.current.clear();
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadMaps()
      .then(({ Map: GMap }) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new GMap(containerRef.current, {
          center: SEOUL_CENTER,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          mapId: 'DEMO_MAP_ID',
        });
        setMapReady(true);
      })
      .catch((err) => console.error('[GoogleMap] load failed', err));

    return () => { cancelled = true; };
  }, []);

  // 지도 컨테이너 DOM 등록 — FLIP fallback 용 (마커 화면 밖일 때 컨테이너 중심 사용).
  useEffect(() => {
    const setEl = useMapStore.getState().setMapContainerEl;
    setEl(containerRef.current);
    return () => setEl(null);
  }, []);

  // 외부(PlaceCard FLIP 등)가 lat/lng → 화면 px 변환을 요청할 수 있도록 projector 등록.
  // OverlayView 의 onAdd 이후 getProjection() 이 유효하므로, 그 시점에 store 에 함수 주입.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || typeof google === 'undefined') return;

    const setProjector = useMapStore.getState().setProjector;
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {
      setProjector((lat: number, lng: number) => {
        const proj = overlay.getProjection();
        if (!proj) return null;
        const point = proj.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lng));
        if (!point) return null;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return { x: rect.left + point.x, y: rect.top + point.y };
      });
    };
    overlay.draw = () => {};
    overlay.onRemove = () => {};
    overlay.setMap(map);

    return () => {
      overlay.setMap(null);
      setProjector(null);
    };
  }, [mapReady]);

  // Create/update markers ONLY when the marker list changes (NOT on selection change)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;

    (async () => {
      const { AdvancedMarkerElement } = await loadMarker();
      if (cancelled || !mapRef.current) return;

      clearOverlays();
      if (markers.length === 0) return;

      const bounds = new google.maps.LatLngBounds();
      const initialSelectedId = selectedIdRef.current;

      markers.forEach((place, index) => {
        const position = { lat: place.lat, lng: place.lng };
        bounds.extend(position);

        const isSelected = initialSelectedId === place.id;
        const { wrapper, pinEl, ringEl, labelEl } = buildMarkerContent(place, index, itineraryMode, isSelected);

        const marker = new AdvancedMarkerElement({
          map,
          position,
          content: wrapper,
          title: place.name,
        });

        marker.addListener('click', () => {
          onSelectRef.current(selectedIdRef.current === place.id ? null : place);
        });

        entriesRef.current.set(place.id, { marker, place, pinEl, ringEl, labelEl });
      });

      // 코스(itineraryMode)일 때만 마커 간 경로선을 그림.
      // 장소/행사 추천처럼 독립된 장소 목록에는 선을 연결하지 않음.
      // 즐겨찾기(isBookmark)는 코스와 무관한 별도 핀이라 경로에서 제외 — 안 그러면
      // 폴리라인이 즐겨찾기 위치까지 이어져 코스가 어지럽게 보임.
      const routeMarkers = markers.filter((p) => !p.isBookmark);
      if (itineraryMode && routeMarkers.length > 1) {
        const path = routeMarkers.map((p) => ({ lat: p.lat, lng: p.lng }));
        polylineRef.current = new google.maps.Polyline({
          path,
          strokeWeight: 7,
          strokeColor: '#1D4ED8',
          strokeOpacity: 0.9,
          map,
        });
      }

      if (markers.length === 1) {
        map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
        map.setZoom(15);
      } else {
        map.fitBounds(bounds, 80);
      }
    })().catch((err) => console.error('[GoogleMap] markers failed', err));

    return () => { cancelled = true; };
  }, [mapReady, markers, itineraryMode, clearOverlays]);

  // Selection style update — runs cheaply on selection change without recreating markers
  useEffect(() => {
    const sid = selectedPlace?.id ?? null;
    entriesRef.current.forEach(({ pinEl, labelEl, place }, id) => {
      applySelectionStyle(pinEl, labelEl, place, id === sid);
    });
  }, [selectedPlace]);

  // Congestion overlay — 3 concentric circles per point for heatmap-like soft falloff (지리좌표 고정)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    if (!showHeatmap || !congestionPoints) return;

    // layers: outer (soft) → inner (hot). Ratios applied to base radiusMeters.
    const LAYERS: { scale: number; opacity: number }[] = [
      { scale: 2.0, opacity: 0.10 }, // outer halo
      { scale: 1.3, opacity: 0.22 }, // middle
      { scale: 0.7, opacity: 0.45 }, // hot core
    ];

    congestionPoints.forEach((p) => {
      LAYERS.forEach(({ scale, opacity }) => {
        const circle = new google.maps.Circle({
          map,
          center: { lat: p.lat, lng: p.lng },
          radius: p.radiusMeters * scale,
          fillColor: p.color,
          fillOpacity: opacity,
          strokeOpacity: 0,
          clickable: false,
        });
        circlesRef.current.push(circle);
      });
    });
  }, [showHeatmap, congestionPoints, mapReady]);

  return (
    <>
      {/* 마커 도장 잉크 번짐(印章) 필터 — 가장자리를 살짝 일그러뜨려 진짜 잉크 느낌. */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <filter id="markerInkBleed" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div ref={containerRef} className="w-full h-full rounded-lg" style={{ minHeight: 300 }} />
    </>
  );
}
