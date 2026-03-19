'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';

interface KakaoMapProps {
  markers: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
}

export default function KakaoMap({ markers, selectedPlace, onSelectPlace }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markerRefs = useRef<kakao.maps.CustomOverlay[]>([]);
  const polylineRef = useRef<kakao.maps.Polyline | null>(null);

  const clearOverlays = useCallback(() => {
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = () => {
      if (!window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        if (!containerRef.current) return;
        const center = new kakao.maps.LatLng(37.5665, 126.978);
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center,
          level: 8,
        });
      });
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      const interval = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(interval);
          initMap();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    clearOverlays();

    if (markers.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();

    markers.forEach((place) => {
      const cat = CATEGORY_CONFIG[place.category];
      const position = new kakao.maps.LatLng(place.lat, place.lng);
      bounds.extend(position);

      const isSelected = selectedPlace?.id === place.id;
      const size = isSelected ? 44 : 36;
      const glowSize = isSelected ? 20 : 10;

      const content = document.createElement('div');
      content.innerHTML = `
        <div style="
          width: ${size}px; height: ${size}px;
          background: ${cat.color};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: ${isSelected ? 13 : 11}px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          box-shadow: 0 2px 8px ${cat.color}40;
          transition: all 0.2s;
          border: 2px solid ${isSelected ? 'white' : `${cat.color}80`};
        ">${cat.label[0]}</div>
        <div style="
          font-size: 11px; color: #1A1A18;
          background: white;
          padding: 2px 6px; border-radius: 4px;
          margin-top: 4px; text-align: center;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        ">${place.name}</div>
      `;
      content.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
      content.addEventListener('click', () => {
        onSelectPlace(selectedPlace?.id === place.id ? null : place);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1.3,
      });
      overlay.setMap(mapRef.current!);
      markerRefs.current.push(overlay);
    });

    // Draw polyline if multiple markers
    if (markers.length > 1) {
      const path = markers.map((p) => new kakao.maps.LatLng(p.lat, p.lng));
      polylineRef.current = new kakao.maps.Polyline({
        path,
        strokeWeight: 3,
        strokeColor: '#4FFFB0',
        strokeOpacity: 0.7,
        strokeStyle: 'solid',
      });
      polylineRef.current.setMap(mapRef.current);
    }

    mapRef.current.setBounds(bounds, 60, 60, 60, 60);
  }, [markers, selectedPlace, onSelectPlace, clearOverlays]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg" style={{ minHeight: 300 }} />
  );
}
