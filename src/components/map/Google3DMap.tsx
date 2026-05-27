import { useEffect, useRef, useState } from 'react';
import type { Place } from '@/types';
import type { NavigationState } from '@/stores/mapStore';
import { loadMaps3D } from '@/lib/google-maps-loader';
import { CATEGORY_CONFIG } from '@/lib/utils';

const SELECTED_COLOR = '#DC2626';

interface Google3DMapProps {
  markers: Place[];
  selectedPlace: Place | null;
  center: { lat: number; lng: number };
  onLoadingChange: (loading: boolean) => void;
  onError: (msg: string) => void;
  onSelectPlace?: (place: Place | null) => void;
  navigation?: NavigationState | null;
}

// maps3d alpha — types 가 아직 부족해 명시적 shape 만 선언.
type Map3DElementInstance = HTMLElement & {
  flyCameraTo: (opts: {
    endCamera: {
      center: { lat: number; lng: number; altitude?: number };
      range: number;
      tilt: number;
      heading: number;
    };
    durationMillis: number;
  }) => void;
};

export default function Google3DMap({
  markers,
  selectedPlace,
  center,
  onLoadingChange,
  onError,
  onSelectPlace,
  navigation,
}: Google3DMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<Map3DElementInstance | null>(null);
  // 동적 import 한 maps3d 라이브러리 — Map3DElement/Marker3D/Polyline3D 클래스 보관.
  const libRef = useRef<unknown>(null);
  const markerElsRef = useRef<HTMLElement[]>([]);
  const polylineElRef = useRef<HTMLElement | null>(null);
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;
  // Map3DElement 생성 완료 신호. ref 만 쓰면 marker/fly/polyline effect 가 비동기
  // 준비 완료 시점에 re-run 되지 않아 마커가 영영 안 그려지는 문제 방지.
  const [mapReady, setMapReady] = useState(0);

  // 초기 마운트 — maps3d 라이브러리 + Map3DElement 한 번만 생성.
  // selectedPlace/navigation/markers 는 별도 effect 가 처리.
  useEffect(() => {
    let cancelled = false;
    onLoadingChange(true);

    // 15초 timeout — maps3d 라이브러리가 reject 도 resolve 도 안 하고 hang 되는
    // 케이스 (Map Tiles API 미활성, API key 권한 부재 등) 무한 로딩 방지.
    const timeoutId = window.setTimeout(() => {
      if (cancelled || mapElRef.current) return;
      cancelled = true;
      console.error('[Google3DMap] maps3d 로딩 15초 timeout — Map Tiles API 활성화 또는 API key 권한 확인 필요');
      onError('3D 지도 로딩 시간 초과 — Map Tiles API 설정을 확인하세요');
      onLoadingChange(false);
    }, 15000);

    (async () => {
      try {
        const lib = await loadMaps3D();
        window.clearTimeout(timeoutId);
        if (cancelled || !containerRef.current) return;
        libRef.current = lib;

        const Map3DClass = (lib as { Map3DElement: new (opts: unknown) => Map3DElementInstance }).Map3DElement;
        if (!Map3DClass) {
          console.error('[Google3DMap] Map3DElement not found in maps3d library', lib);
          throw new Error('Map3DElement 미발견 — alpha 채널 확인 필요');
        }
        // 초기 range 를 작게 — 첫 paint 시 fetch 할 tile 수 최소화. 이후 flyCameraTo
        // effect 가 navigation 여부에 따라 적절한 range 로 즉시 줌인/줌아웃.
        const mapEl = new Map3DClass({
          center: { lat: center.lat, lng: center.lng, altitude: 80 },
          range: 500,
          tilt: 65,
          heading: 0,
        });
        mapEl.style.display = 'block';
        mapEl.style.width = '100%';
        mapEl.style.height = '100%';
        containerRef.current.appendChild(mapEl);
        mapElRef.current = mapEl;
        // marker/fly/polyline effect 가 mapEl/lib 준비된 상태로 한 번 더 돌도록 트리거.
        setMapReady((n) => n + 1);
        onLoadingChange(false);
      } catch (err) {
        window.clearTimeout(timeoutId);
        if (cancelled) return;
        console.error('[Google3DMap] load error', err);
        const msg = err instanceof Error ? err.message : '3D 지도 로딩 실패';
        onError(msg);
        onLoadingChange(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      for (const m of markerElsRef.current) m.remove();
      markerElsRef.current = [];
      if (polylineElRef.current) {
        polylineElRef.current.remove();
        polylineElRef.current = null;
      }
      if (mapElRef.current) {
        mapElRef.current.remove();
        mapElRef.current = null;
      }
    };
    // 초기 center 만 사용 — 이후 위치 변경은 flyCameraTo effect 가 처리.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커 동기화 — markers 또는 selectedPlace 변경 시 전체 재구성.
  // Marker3D 는 가벼워서 재구성 비용 무시 가능.
  useEffect(() => {
    const mapEl = mapElRef.current;
    const lib = libRef.current as
      | {
          Marker3DInteractiveElement?: new (opts: unknown) => HTMLElement;
          Marker3DElement?: new (opts: unknown) => HTMLElement;
        }
      | null;
    if (!mapEl || !lib) return;

    for (const m of markerElsRef.current) m.remove();
    markerElsRef.current = [];

    // Interactive 가 있으면 click 이벤트 지원, 아니면 정적 마커.
    const MarkerClass = lib.Marker3DInteractiveElement ?? lib.Marker3DElement;
    if (!MarkerClass) return;

    for (const place of markers) {
      const isSelected = place.id === selectedPlace?.id;
      const catColor = CATEGORY_CONFIG[place.category]?.color ?? '#1F3A8B';
      const pinColor = isSelected ? SELECTED_COLOR : catColor;

      const m = new MarkerClass({
        // 빌딩 옥상 위 충분히 띄워서 photorealistic 텍스처 위에서도 핀이 잘 보임.
        position: {
          lat: place.lat,
          lng: place.lng,
          altitude: isSelected ? 140 : 90,
        },
        altitudeMode: 'RELATIVE_TO_MESH',
        // 지면까지 폴 표시 — 어느 빌딩인지 한눈에 식별.
        extruded: true,
        // 줌아웃해도 작아지지 않도록 화면 픽셀 기준 고정.
        sizePreserved: true,
        label: place.name,
        zIndex: isSelected ? 100 : 10,
      });

      // 카테고리/선택 색의 Pin3D 슬로팅. Pin3DElement 가 없는 환경엔 graceful fallback —
      // 기본 마커 + label 만 표시.
      const Pin3DClass = (lib as { Pin3DElement?: new (opts: unknown) => HTMLElement }).Pin3DElement;
      if (Pin3DClass) {
        try {
          const pin = new Pin3DClass({
            backgroundColor: pinColor,
            borderColor: '#FFFFFF',
            glyphColor: '#FFFFFF',
            scale: isSelected ? 1.8 : 1.3,
          });
          pin.setAttribute('slot', 'default');
          m.appendChild(pin);
        } catch {
          /* 일부 alpha 빌드에 Pin3DElement 미노출 — 기본 마커 그대로. */
        }
      }

      if (lib.Marker3DInteractiveElement) {
        m.addEventListener('gmp-click', () => onSelectPlaceRef.current?.(place));
        m.style.cursor = 'pointer';
      }
      mapEl.appendChild(m);
      markerElsRef.current.push(m);
    }
  }, [mapReady, markers, selectedPlace?.id]);

  // 카메라 fly — navigation 우선, 다음 selectedPlace, 다음 markers[0].
  useEffect(() => {
    const mapEl = mapElRef.current;
    if (!mapEl) return;

    let target: { lat: number; lng: number } | null = null;
    let close = false;

    if (navigation) {
      const stop = navigation.itinerary.stops[navigation.stopIndex];
      if (stop?.lat != null && stop.lng != null) {
        target = { lat: stop.lat, lng: stop.lng };
        close = true;
      }
    } else if (selectedPlace) {
      target = { lat: selectedPlace.lat, lng: selectedPlace.lng };
      close = true;
    } else if (markers.length > 0) {
      target = { lat: markers[0].lat, lng: markers[0].lng };
    }

    if (!target) return;
    try {
      mapEl.flyCameraTo({
        endCamera: {
          center: { ...target, altitude: 80 },
          range: close ? 300 : 800,
          tilt: close ? 72 : 65,
          heading: 0,
        },
        durationMillis: 1500,
      });
    } catch {
      /* mapEl removed during async — ignore */
    }
  }, [
    mapReady,
    selectedPlace?.id,
    navigation?.itinerary.id,
    navigation?.stopIndex,
    markers,
  ]);

  // 경로 폴리라인 — navigation 시작/해제/itinerary 변경 시 재구성.
  useEffect(() => {
    const mapEl = mapElRef.current;
    const lib = libRef.current as { Polyline3DElement?: new (opts: unknown) => HTMLElement } | null;
    if (!mapEl || !lib) return;

    if (polylineElRef.current) {
      polylineElRef.current.remove();
      polylineElRef.current = null;
    }

    if (!navigation) return;

    const PolylineClass = lib.Polyline3DElement;
    if (!PolylineClass) return;

    const coords = navigation.itinerary.stops
      .filter((s): s is typeof s & { lat: number; lng: number } => s.lat != null && s.lng != null)
      .map((s) => ({ lat: s.lat, lng: s.lng, altitude: 10 }));
    if (coords.length < 2) return;

    const poly = new PolylineClass({
      coordinates: coords,
      strokeColor: '#2563EB',
      strokeWidth: 8,
      altitudeMode: 'RELATIVE_TO_GROUND',
    });
    mapEl.appendChild(poly);
    polylineElRef.current = poly;
  }, [mapReady, navigation?.itinerary.id]);

  return <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: 300 }} />;
}
