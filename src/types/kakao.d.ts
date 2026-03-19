declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
  }

  class Polyline {
    constructor(options: PolylineOptions);
    setMap(map: Map | null): void;
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
  }

  interface CustomOverlayOptions {
    position: LatLng;
    content: string | HTMLElement;
    map?: Map;
    yAnchor?: number;
    xAnchor?: number;
  }

  interface PolylineOptions {
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    map?: Map;
  }

  interface InfoWindowOptions {
    content: string;
  }

  namespace event {
    function addListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao: typeof kakao;
}
