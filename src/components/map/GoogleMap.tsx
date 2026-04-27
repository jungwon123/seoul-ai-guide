import { useEffect, useRef, useState, useCallback } from 'react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { loadMaps, loadMarker } from '@/lib/google-maps-loader';

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

  wrapper.innerHTML = `
    <div data-ring style="position: relative;">
      <div data-pin style="
        background: ${cat.color};
        ${shape}
        display: flex; align-items: center; justify-content: center;
        font-weight: 700;
        color: white;
        letter-spacing: -0.02em;
        transition: width 0.15s, height 0.15s, font-size 0.15s, box-shadow 0.15s;
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

      if (markers.length > 1) {
        const path = markers.map((p) => ({ lat: p.lat, lng: p.lng }));
        polylineRef.current = new google.maps.Polyline({
          path,
          strokeWeight: itineraryMode ? 7 : 5,
          strokeColor: itineraryMode ? '#1D4ED8' : '#4F46E5',
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
    <div ref={containerRef} className="w-full h-full rounded-lg" style={{ minHeight: 300 }} />
  );
}
