'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LayerConfig } from './Sidebar';

import 'leaflet/dist/leaflet.css';

const MAP_CENTER: [number, number] = [39.9526, -75.1652];
const MAP_ZOOM = 13;

interface MapProperty {
  id: number; parcel_id: string; address: string; owner: string;
  lat: number; lng: number; market_value?: number; total_area?: number;
  zip_code?: string; blight_score: number; category?: string;
}
interface MapViolation {
  id: number; violation_id: string; address: string;
  lat: number; lng: number; violation_type: string; violation_date?: string; status?: string;
}

interface PhillyMapProps {
  layers: LayerConfig[];
  riskFilter: string;
  onPropertySelect: (property: MapProperty) => void;
  onNeighborhoodSelect: (name: string) => void;
  flyTo?: { lat: number; lng: number } | null;
}

function blightColor(score: number) {
  if (score >= 80) return '#FF2D55';
  if (score >= 60) return '#FF6B35';
  if (score >= 40) return '#FFCC00';
  return '#00E5A0';
}
const VACANT_COLOR = '#8B2EFF';    // deep purple - vacant parcels
const VIOLATION_COLOR = '#D48BFF'; // light purple - code violations

export default function PhillyMap({ layers, riskFilter, onPropertySelect, onNeighborhoodSelect, flyTo }: PhillyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import('leaflet').Map | null>(null);
  const propertyMarkersRef = useRef<import('leaflet').CircleMarker[]>([]);
  const violMarkersRef = useRef<import('leaflet').CircleMarker[]>([]);
  const neighborhoodLayersRef = useRef<import('leaflet').Polygon[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 19 }
      ).addTo(map);

      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstance.current = map;
      setMapLoaded(true);
    });

    return () => {
      propertyMarkersRef.current.forEach(m => m.remove());
      violMarkersRef.current.forEach(m => m.remove());
      neighborhoodLayersRef.current.forEach(p => p.remove());
      if (searchMarkerRef.current) { searchMarkerRef.current.remove(); searchMarkerRef.current = null; }
      if (searchMarkerTimerRef.current) clearTimeout(searchMarkerTimerRef.current);
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
      propertyMarkersRef.current = [];
      violMarkersRef.current = [];
      neighborhoodLayersRef.current = [];
    };
  }, []);

  const searchMarkerRef = useRef<import('leaflet').CircleMarker | null>(null);
  const searchMarkerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!flyTo || !mapInstance.current) return;
    import('leaflet').then((L) => {
      const map = mapInstance.current;
      if (!map) return;

      // Remove previous search marker
      if (searchMarkerRef.current) { searchMarkerRef.current.remove(); searchMarkerRef.current = null; }
      if (searchMarkerTimerRef.current) clearTimeout(searchMarkerTimerRef.current);

      // Fly to location at street level
      map.setView([flyTo.lat, flyTo.lng], 16, { animate: true, duration: 0.8 });

      // Drop a pulsing search marker
      const marker = L.circleMarker([flyTo.lat, flyTo.lng], {
        radius: 10,
        color: '#7CD9FF',
        fillColor: '#7CD9FF',
        fillOpacity: 0.35,
        weight: 2,
        opacity: 0.9,
      }).addTo(map);
      searchMarkerRef.current = marker;

      // Auto-remove after 5 seconds
      searchMarkerTimerRef.current = setTimeout(() => {
        marker.remove();
        searchMarkerRef.current = null;
      }, 5000);
    });
  }, [flyTo]);

  const loadVacantBuildings = useCallback(async () => {
    const map = mapInstance.current;
    if (!map) return;
    const L = await import('leaflet');

    propertyMarkersRef.current.forEach(m => m.remove());
    propertyMarkersRef.current = [];

    const vacantLayer = layers.find(l => l.key === 'vacant_parcels');
    const blightLayer = layers.find(l => l.key === 'blight_scores');

    if (!vacantLayer?.enabled && !blightLayer?.enabled) return;

    try {
      const riskParam = riskFilter !== 'all' ? `&risk_tier=${riskFilter}` : '';
      const res = await fetch(`/api/map?layer=vacant_buildings&limit=2000${riskParam}`);
      const data = await res.json();
      const properties: MapProperty[] = data.data || [];

      // When a risk filter is active, all returned markers belong to that tier - use its color consistently
      const FILTER_COLORS: Record<string, string> = {
        critical: '#FF2D55', high: '#FF6B35', medium: '#FFCC00', low: '#00E5A0',
      };
      const filterColor = riskFilter !== 'all' ? FILTER_COLORS[riskFilter] : null;

      properties.forEach(prop => {
        const score = prop.blight_score || 0;
        const color = filterColor ?? (blightLayer?.enabled ? blightColor(score) : VACANT_COLOR);
        const radius = blightLayer?.enabled ? Math.max(3, Math.min(9, score / 11)) : 4;
        const marker = L.circleMarker([prop.lat, prop.lng], {
          radius,
          color: 'rgba(255,255,255,0.3)',
          weight: 0.8,
          fillColor: color,
          fillOpacity: 0.88,
        }).addTo(map);
        marker.on('click', () => onPropertySelect(prop));
        marker.bindTooltip(prop.address, { sticky: true, className: 'holmes-tooltip' });
        propertyMarkersRef.current.push(marker);
      });
    } catch (err) { console.error('Failed to load vacant buildings:', err); }
  }, [layers, riskFilter, onPropertySelect]);

  const loadViolations = useCallback(async () => {
    const map = mapInstance.current;
    if (!map) return;
    const L = await import('leaflet');

    violMarkersRef.current.forEach(m => m.remove());
    violMarkersRef.current = [];
    const violLayer = layers.find(l => l.key === 'violations');
    if (!violLayer?.enabled) return;

    try {
      const res = await fetch('/api/map?layer=violations&limit=2000');
      const data = await res.json();
      (data.data || []).forEach((v: MapViolation) => {
        const marker = L.circleMarker([v.lat, v.lng], {
          radius: 4,
          color: 'rgba(255,255,255,0.2)',
          weight: 0.5,
          fillColor: VIOLATION_COLOR,
          fillOpacity: 0.85,
        }).addTo(map);
        marker.bindTooltip(v.address, { sticky: true, className: 'holmes-tooltip' });
        violMarkersRef.current.push(marker);
      });
    } catch (err) { console.error('Failed to load violations:', err); }
  }, [layers]);

  const loadNeighborhoods = useCallback(async () => {
    const map = mapInstance.current;
    if (!map) return;
    const L = await import('leaflet');

    neighborhoodLayersRef.current.forEach(p => p.remove());
    neighborhoodLayersRef.current = [];
    const nbrLayer = layers.find(l => l.key === 'neighborhoods');
    if (!nbrLayer?.enabled) return;

    try {
      const res = await fetch('/api/neighborhoods');
      const data = await res.json();
      (data.neighborhoods || []).forEach((nbr: { name: string; geojson: { geometry: { type: string; coordinates: number[][][] | number[][][][] } } }) => {
        if (!nbr.geojson?.geometry) return;
        const geom = nbr.geojson.geometry;

        let latlngs: [number, number][][] = [];
        if (geom.type === 'Polygon') {
          latlngs = (geom.coordinates as number[][][]).map(ring => ring.map(c => [c[1], c[0]] as [number, number]));
        } else if (geom.type === 'MultiPolygon') {
          latlngs = (geom.coordinates as number[][][][]).flatMap(poly =>
            poly.map(ring => ring.map(c => [c[1], c[0]] as [number, number]))
          );
        }
        if (!latlngs.length) return;

        const polygon = L.polygon(latlngs, {
          fillColor: '#5A1AB8',
          fillOpacity: 0.07,
          color: '#B13BFF',
          opacity: 0.45,
          weight: 1.2,
        }).addTo(map);

        polygon.on('click', () => onNeighborhoodSelect(nbr.name));
        polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: 0.22, opacity: 0.85, color: '#D48BFF' }));
        polygon.on('mouseout',  () => polygon.setStyle({ fillOpacity: 0.07, opacity: 0.45, color: '#B13BFF' }));
        polygon.bindTooltip(nbr.name, { sticky: true, className: 'holmes-tooltip' });

        neighborhoodLayersRef.current.push(polygon);
      });
    } catch (err) { console.error('Failed to load neighborhoods:', err); }
  }, [layers, onNeighborhoodSelect]);

  useEffect(() => {
    if (!mapLoaded) return;
    loadVacantBuildings();
    loadViolations();
    loadNeighborhoods();
  }, [mapLoaded, layers, riskFilter, loadVacantBuildings, loadViolations, loadNeighborhoods]);

  return (
    <>
      <div
        ref={mapRef}
        className="fixed inset-0 z-0"
        style={{ background: '#0a0a1a' }}
        role="application"
        aria-label="Philadelphia housing crisis map"
      />
      <style>{`
        .holmes-tooltip {
          background: rgba(9,0,64,0.92) !important;
          border: 1px solid rgba(177,59,255,0.35) !important;
          color: rgba(255,255,255,0.9) !important;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 11px !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
          white-space: nowrap !important;
        }
        .holmes-tooltip::before { display: none !important; }
        .leaflet-control-zoom a {
          background: rgba(9,0,64,0.9) !important;
          color: rgba(255,255,255,0.8) !important;
          border: 1px solid rgba(177,59,255,0.3) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(45,11,94,0.95) !important;
          color: white !important;
        }
        .leaflet-control-attribution {
          background: rgba(9,0,64,0.7) !important;
          color: rgba(255,255,255,0.35) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: rgba(177,59,255,0.6) !important; }
      `}</style>
    </>
  );
}
