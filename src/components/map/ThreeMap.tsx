'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapScene3D } from '@/lib/three-scene';
import { fetchBuildings } from '@/lib/overpass';
import type { Place } from '@/types';

interface ThreeMapProps {
  markers: Place[];
  selectedPlace: Place | null;
  center: { lat: number; lng: number };
  zoom: number;
  onLoadingChange: (loading: boolean) => void;
  onBuildingCount: (count: number) => void;
  onError: (msg: string) => void;
}

export default function ThreeMap({
  markers,
  selectedPlace,
  center,
  zoom,
  onLoadingChange,
  onBuildingCount,
  onError,
}: ThreeMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<MapScene3D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedCenterRef = useRef<string>('');

  // Initialize scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new MapScene3D(canvasRef.current);
    sceneRef.current = scene;
    scene.start();

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        sceneRef.current?.resize(width, height);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Load buildings + tiles when center changes
  const loadArea = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)},${zoom}`;
    if (loadedCenterRef.current === key) return;
    loadedCenterRef.current = key;

    onLoadingChange(true);
    try {
      // Calculate bounds from center + zoom
      const latSpan = 0.01 * Math.pow(2, 16 - zoom);
      const lonSpan = latSpan * 1.3;
      const bounds = {
        south: center.lat - latSpan / 2,
        north: center.lat + latSpan / 2,
        west: center.lng - lonSpan / 2,
        east: center.lng + lonSpan / 2,
      };

      const buildings = await fetchBuildings(bounds.south, bounds.west, bounds.north, bounds.east);
      onBuildingCount(buildings.length);

      scene.loadBuildings(buildings, { lat: center.lat, lon: center.lng });
      await scene.loadGround(bounds, zoom);
      scene.resetCamera();
    } catch (err) {
      onError(err instanceof Error ? err.message : '3D 로딩 실패');
      loadedCenterRef.current = '';
    } finally {
      onLoadingChange(false);
    }
  }, [center, zoom, onLoadingChange, onBuildingCount, onError]);

  useEffect(() => {
    loadArea();
  }, [loadArea]);

  // Update place markers
  useEffect(() => {
    sceneRef.current?.setPlaceMarkers(markers, selectedPlace?.id);
  }, [markers, selectedPlace]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: 300 }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
