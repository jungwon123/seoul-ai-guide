

import { useEffect, useRef, useCallback } from 'react';
import { MapScene3D } from '@/lib/three-scene';
import { fetchBuildings, fetchBuildingsNearPoint } from '@/lib/overpass';
import type { Place } from '@/types';
import { useMapStore } from '@/stores/mapStore';
import type { NavigationState } from '@/stores/mapStore';

interface ThreeMapProps {
  markers: Place[];
  selectedPlace: Place | null;
  center: { lat: number; lng: number };
  zoom: number;
  onLoadingChange: (loading: boolean) => void;
  onBuildingCount: (count: number) => void;
  onError: (msg: string) => void;
  navigation?: NavigationState | null;
}

export default function ThreeMap({
  markers,
  selectedPlace,
  center,
  zoom,
  onLoadingChange,
  onBuildingCount,
  onError,
  navigation,
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
      const latSpan = 0.01 * Math.pow(2, 16 - zoom);
      const lonSpan = latSpan * 1.3;
      const bounds = {
        south: center.lat - latSpan / 2,
        north: center.lat + latSpan / 2,
        west: center.lng - lonSpan / 2,
        east: center.lng + lonSpan / 2,
      };

      // Set center first so markers render immediately
      scene.loadBuildings([], { lat: center.lat, lon: center.lng });

      // Load ground tiles + buildings in parallel
      const [buildings] = await Promise.all([
        fetchBuildings(bounds.south, bounds.west, bounds.north, bounds.east),
        scene.loadGround(bounds, zoom),
      ]);

      // Ground is visible now — hide spinner
      onLoadingChange(false);
      scene.resetCamera();

      // Add buildings (non-blocking visual enhancement)
      if (buildings.length > 0) {
        scene.loadBuildings(buildings, { lat: center.lat, lon: center.lng });
        onBuildingCount(buildings.length);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : '3D 로딩 실패');
      loadedCenterRef.current = '';
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

  // Navigation: render route + fly to current stop + per-stop buildings
  const prevNavRef = useRef<string | null>(null);
  const prevStopBuildingRef = useRef<number>(-1);
  const navId = navigation?.itinerary.id ?? null;
  const navStopIndex = navigation?.stopIndex ?? -1;
  const navIsPlaying = navigation?.isPlaying ?? false;
  const navStopCount = navigation?.itinerary.stops.length ?? 0;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (!navigation) {
      scene.clearRoute();
      prevNavRef.current = null;
      prevStopBuildingRef.current = -1;
      return;
    }

    // Build stop coords from markers, fallback to stop's own lat/lng (SSE-driven).
    const stopCoords = navigation.itinerary.stops.map((stop) => {
      const place = markers.find((m) => m.id === stop.placeId);
      if (place) return { lat: place.lat, lng: place.lng };
      if (stop.lat != null && stop.lng != null) return { lat: stop.lat, lng: stop.lng };
      return null;
    }).filter((c): c is { lat: number; lng: number } => c !== null);

    if (stopCoords.length < 2) return;

    // Only render route once per itinerary
    if (prevNavRef.current !== navId) {
      scene.renderRoute(stopCoords);
      prevNavRef.current = navId;
    }

    // Fly to current stop
    scene.flyToStop(navStopIndex, stopCoords);

    // Load buildings around current stop (skip if same stop)
    if (prevStopBuildingRef.current !== navStopIndex) {
      prevStopBuildingRef.current = navStopIndex;
      const coord = stopCoords[navStopIndex];
      if (coord) {
        fetchBuildingsNearPoint(coord.lat, coord.lng, 500).then((buildings) => {
          if (!sceneRef.current) return;
          sceneRef.current.transitionBuildings(buildings, { lat: coord.lat, lon: coord.lng });
          onBuildingCount(buildings.length);
        });
      }
    }
  }, [navId, navStopIndex, navigation, markers, onBuildingCount]);

  // Auto-play: advance stops when isPlaying (primitive deps)
  useEffect(() => {
    if (!navIsPlaying) return;
    if (navStopIndex >= navStopCount - 1) return;

    const timer = setTimeout(() => {
      useMapStore.getState().goToStop(navStopIndex + 1);
    }, 3500);

    return () => clearTimeout(timer);
  }, [navIsPlaying, navStopIndex, navStopCount]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: 300 }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
