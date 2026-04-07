'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { LayerKey, LayerConfig } from './Sidebar';

const MAP_CENTER = { lat: 39.9526, lng: -75.1652 };
const MAP_ZOOM = 12;

// mapId is REQUIRED for AdvancedMarkerElement
const MAP_ID = 'DEMO_MAP_ID';

// Improved dark style — roads are vivid violet so map is visibly distinct from void background
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#08002A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.8)' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08002A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020016' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A3080' }] },
  // Highways — bright violet so streets pop against background
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#7C3AED' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#9D5BFF' }, { weight: 0.5 }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#C4A0FF' }] },
  // Arterial — medium purple
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3D1480' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#5A1AB8' }, { weight: 0.3 }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#8B60CC' }] },
  // Local roads — subtle but distinct
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#1A0848' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#5A3A8A' }] },
  // Landscape
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0A0428' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#0E0535' }] },
  // Hide clutter
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Neighborhood labels — neon
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#B13BFF' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.stroke', stylers: [{ color: '#08002A' }, { weight: 3 }] },
  // City labels
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.6)' }] },
];

// Module-level guard — setOptions must be called exactly once per browser session
let _mapsConfigured = false;

interface MapProperty {
  id: number;
  parcel_id: string;
  address: string;
  owner: string;
  lat: number;
  lng: number;
  market_value?: number;
  total_area?: number;
  zip_code?: string;
  blight_score: number;
  category?: string;
}

interface MapViolation {
  id: number;
  violation_id: string;
  address: string;
  lat: number;
  lng: number;
  violation_type: string;
  violation_date?: string;
  status?: string;
}

interface MapEviction {
  id: number;
  case_id: string;
  address: string;
  lat: number;
  lng: number;
  filing_date?: string;
  judgment?: string;
  amount?: number;
}

interface HeatPoint { lat: number; lng: number; weight: number; }

interface PhillyMapProps {
  layers: LayerConfig[];
  riskFilter: string;
  onPropertySelect: (property: MapProperty) => void;
  onNeighborhoodSelect: (name: string) => void;
  flyTo?: { lat: number; lng: number } | null;
}

function blightColor(score: number): string {
  if (score >= 80) return '#FF2D55';
  if (score >= 60) return '#FF6B35';
  if (score >= 40) return '#FFCC00';
  return '#00E5A0';
}

function violationColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('struct') || t.includes('exterior') || t.includes('foundation')) return '#FF2D55';
  if (t.includes('electr')) return '#FFCC00';
  if (t.includes('sanit') || t.includes('rodent') || t.includes('pest')) return '#00BFFF';
  return '#B13BFF';
}

/** Create a styled HTMLElement for use as AdvancedMarkerElement content */
function makeCircleMarker(color: string, size: number): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${size * 2}px;
    height: ${size * 2}px;
    border-radius: 50%;
    background: ${color};
    opacity: 0.88;
    border: 1px solid rgba(255,255,255,0.35);
    cursor: pointer;
    box-shadow: 0 0 ${size}px ${color}66;
    transition: transform 120ms ease, box-shadow 120ms ease;
  `;
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.4)';
    el.style.boxShadow = `0 0 ${size * 2}px ${color}BB`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
    el.style.boxShadow = `0 0 ${size}px ${color}66`;
  });
  return el;
}

function makeSquareMarker(color: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 8px; height: 8px;
    background: ${color};
    opacity: 0.85;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 1px;
    cursor: pointer;
    transition: transform 120ms ease;
  `;
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.5)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
  return el;
}

function makeTriangleMarker(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 0; height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 11px solid #FFCC00;
    cursor: pointer;
    filter: drop-shadow(0 0 4px rgba(255,204,0,0.6));
    transition: filter 120ms ease;
  `;
  el.addEventListener('mouseenter', () => { el.style.filter = 'drop-shadow(0 0 8px rgba(255,204,0,0.9))'; });
  el.addEventListener('mouseleave', () => { el.style.filter = 'drop-shadow(0 0 4px rgba(255,204,0,0.6))'; });
  return el;
}

export default function PhillyMap({
  layers,
  riskFilter,
  onPropertySelect,
  onNeighborhoodSelect,
  flyTo,
}: PhillyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const heatmapOverlay = useRef<google.maps.OverlayView | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const violMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const evictMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const neighborhoodPolygons = useRef<google.maps.Polygon[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!_mapsConfigured) {
      _mapsConfigured = true;
      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!, v: 'weekly' });
    }

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('geometry'),
    ]).then(() => {
      if (!mapRef.current) return;
      const map = new google.maps.Map(mapRef.current, {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        mapId: MAP_ID,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        gestureHandling: 'greedy',
      });
      mapInstance.current = map;
      setMapLoaded(true);
    }).catch(err => console.error('Maps init failed:', err));

    return () => {
      markersRef.current.forEach(m => { m.map = null; });
      violMarkersRef.current.forEach(m => { m.map = null; });
      evictMarkersRef.current.forEach(m => { m.map = null; });
      neighborhoodPolygons.current.forEach(p => p.setMap(null));
      if (heatmapOverlay.current) { heatmapOverlay.current.setMap(null); heatmapOverlay.current = null; }
    };
  }, []);

  useEffect(() => {
    if (flyTo && mapInstance.current) {
      mapInstance.current.panTo({ lat: flyTo.lat, lng: flyTo.lng });
      mapInstance.current.setZoom(16);
    }
  }, [flyTo]);

  const loadVacantBuildings = useCallback(async () => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];

    const vacantLayer = layers.find(l => l.key === 'vacant_parcels');
    const blightLayer = layers.find(l => l.key === 'blight_scores');
    const heatLayer = layers.find(l => l.key === 'heatmap');

    if (!vacantLayer?.enabled && !blightLayer?.enabled && !heatLayer?.enabled) {
      if (heatmapOverlay.current) { heatmapOverlay.current.setMap(null); heatmapOverlay.current = null; }
      return;
    }

    try {
      const riskParam = riskFilter !== 'all' ? `&risk_tier=${riskFilter}` : '';
      const res = await fetch(`/api/map?layer=vacant_buildings&limit=2000${riskParam}`);
      const data = await res.json();
      const properties: MapProperty[] = data.data || [];

      // Custom canvas heatmap
      if (heatLayer?.enabled) {
        if (heatmapOverlay.current) { heatmapOverlay.current.setMap(null); heatmapOverlay.current = null; }

        const heatPoints: HeatPoint[] = properties.map(p => ({ lat: p.lat, lng: p.lng, weight: (p.blight_score || 0) / 100 }));
        const radius = 25;
        const opacity = heatLayer.opacity * 0.8;

        class HeatmapOverlay extends google.maps.OverlayView {
          private canvas: HTMLCanvasElement;
          constructor() {
            super();
            this.canvas = document.createElement('canvas');
            Object.assign(this.canvas.style, { position: 'absolute', pointerEvents: 'none' });
          }
          onAdd() { this.getPanes()!.overlayLayer.appendChild(this.canvas); }
          draw() {
            const proj = this.getProjection();
            const m = this.getMap() as google.maps.Map;
            if (!proj || !m) return;
            const bounds = m.getBounds();
            if (!bounds) return;
            const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast())!;
            const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest())!;
            const left = Math.round(sw.x), top = Math.round(ne.y);
            const width = Math.round(ne.x) - left, height = Math.round(sw.y) - top;
            this.canvas.style.left = `${left}px`;
            this.canvas.style.top = `${top}px`;
            this.canvas.width = width;
            this.canvas.height = height;
            const ctx = this.canvas.getContext('2d')!;
            ctx.clearRect(0, 0, width, height);
            ctx.globalAlpha = opacity;
            ctx.globalCompositeOperation = 'screen';
            for (const p of heatPoints) {
              const px = proj.fromLatLngToDivPixel(new google.maps.LatLng(p.lat, p.lng));
              if (!px) continue;
              const x = Math.round(px.x) - left, y = Math.round(px.y) - top;
              if (x < -radius || x > width + radius || y < -radius || y > height + radius) continue;
              const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
              const w = p.weight;
              if (w >= 0.8) { g.addColorStop(0, 'rgba(255,45,85,0.22)'); g.addColorStop(0.5, 'rgba(255,107,53,0.10)'); }
              else if (w >= 0.6) { g.addColorStop(0, 'rgba(255,107,53,0.18)'); g.addColorStop(0.5, 'rgba(255,204,0,0.08)'); }
              else if (w >= 0.4) { g.addColorStop(0, 'rgba(255,204,0,0.14)'); g.addColorStop(0.5, 'rgba(177,59,255,0.07)'); }
              else { g.addColorStop(0, 'rgba(177,59,255,0.10)'); g.addColorStop(0.5, 'rgba(71,19,150,0.05)'); }
              g.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          onRemove() { this.canvas.parentNode?.removeChild(this.canvas); }
        }

        try {
          const overlay = new HeatmapOverlay();
          overlay.setMap(map);
          heatmapOverlay.current = overlay;
        } catch (e) { console.warn('HeatmapOverlay failed:', e); }
      } else if (heatmapOverlay.current) {
        heatmapOverlay.current.setMap(null);
        heatmapOverlay.current = null;
      }

      // AdvancedMarkerElement for individual property dots
      if (vacantLayer?.enabled || blightLayer?.enabled) {
        properties.forEach(prop => {
          const score = prop.blight_score || 0;
          const color = blightLayer?.enabled ? blightColor(score) : '#B13BFF';
          const size = blightLayer?.enabled ? Math.max(4, Math.min(10, score / 10)) : 5;

          const content = makeCircleMarker(color, size);
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: prop.lat, lng: prop.lng },
            map,
            title: prop.address,
            content,
          });
          marker.addListener('click', () => onPropertySelect(prop));
          markersRef.current.push(marker);
        });
      }
    } catch (err) {
      console.error('Failed to load vacant buildings:', err);
    }
  }, [layers, riskFilter, onPropertySelect]);

  const loadViolations = useCallback(async () => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    violMarkersRef.current.forEach(m => { m.map = null; });
    violMarkersRef.current = [];

    const violLayer = layers.find(l => l.key === 'violations');
    if (!violLayer?.enabled) return;

    try {
      const res = await fetch('/api/map?layer=violations&limit=2000');
      const data = await res.json();
      const violations: MapViolation[] = data.data || [];

      violations.forEach(v => {
        const color = violationColor(v.violation_type || '');
        const content = makeSquareMarker(color);
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: v.lat, lng: v.lng },
          map,
          title: v.address,
          content,
        });
        violMarkersRef.current.push(marker);
      });
    } catch (err) {
      console.error('Failed to load violations:', err);
    }
  }, [layers]);

  const loadEvictions = useCallback(async () => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    evictMarkersRef.current.forEach(m => { m.map = null; });
    evictMarkersRef.current = [];

    const evictLayer = layers.find(l => l.key === 'evictions');
    if (!evictLayer?.enabled) return;

    try {
      const res = await fetch('/api/map?layer=evictions&limit=1500');
      const data = await res.json();
      const evictions: MapEviction[] = data.data || [];

      evictions.forEach(e => {
        const content = makeTriangleMarker();
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: e.lat, lng: e.lng },
          map,
          title: e.address,
          content,
        });
        evictMarkersRef.current.push(marker);
      });
    } catch (err) {
      console.error('Failed to load evictions:', err);
    }
  }, [layers]);

  const loadNeighborhoods = useCallback(async () => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    neighborhoodPolygons.current.forEach(p => p.setMap(null));
    neighborhoodPolygons.current = [];

    const nbrLayer = layers.find(l => l.key === 'neighborhoods');
    if (!nbrLayer?.enabled) return;

    try {
      const res = await fetch('/api/neighborhoods');
      const data = await res.json();
      const neighborhoods = data.neighborhoods || [];

      neighborhoods.forEach((nbr: { name: string; geojson: { geometry: { type: string; coordinates: number[][][] | number[][][][] } } }) => {
        if (!nbr.geojson?.geometry) return;
        const geom = nbr.geojson.geometry;

        let paths: google.maps.LatLng[][] = [];
        if (geom.type === 'Polygon') {
          const coords = geom.coordinates as number[][][];
          paths = coords.map(ring => ring.map((c: number[]) => new google.maps.LatLng(c[1], c[0])));
        } else if (geom.type === 'MultiPolygon') {
          const coords = geom.coordinates as number[][][][];
          paths = coords.flatMap(poly => poly.map(ring => ring.map((c: number[]) => new google.maps.LatLng(c[1], c[0]))));
        }
        if (!paths.length) return;

        const polygon = new google.maps.Polygon({
          paths, map,
          fillColor: '#5A1AB8',
          fillOpacity: 0.06,
          strokeColor: '#B13BFF',
          strokeOpacity: 0.4,
          strokeWeight: 1.2,
        });

        polygon.addListener('click', () => onNeighborhoodSelect(nbr.name));
        polygon.addListener('mouseover', () => polygon.setOptions({ fillOpacity: 0.2, strokeOpacity: 0.8, strokeColor: '#D48BFF' }));
        polygon.addListener('mouseout', () => polygon.setOptions({ fillOpacity: 0.06, strokeOpacity: 0.4, strokeColor: '#B13BFF' }));
        neighborhoodPolygons.current.push(polygon);
      });
    } catch (err) {
      console.error('Failed to load neighborhoods:', err);
    }
  }, [layers, onNeighborhoodSelect]);

  useEffect(() => {
    if (!mapLoaded) return;
    loadVacantBuildings();
    loadViolations();
    loadEvictions();
    loadNeighborhoods();
  }, [mapLoaded, layers, riskFilter, loadVacantBuildings, loadViolations, loadEvictions, loadNeighborhoods]);

  return (
    <div
      ref={mapRef}
      className="fixed inset-0 z-0"
      aria-label="Philadelphia housing crisis map"
      role="application"
    />
  );
}
