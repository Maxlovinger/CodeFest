'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const CENTER: [number, number] = [39.9526, -75.1652];

interface SignalTract {
  geoid: string;
  name: string;
  place_label?: string;
  geojson: { geometry: { type: string; coordinates: number[][][] | number[][][][] } };
  pct_broadband: number;
  pct_no_internet: number;
  pct_no_devices: number;
  pct_minority: number;
  median_income: number;
  population: number;
  wifi_site_count: number;
  avg_site_speed_mbps: number;
  risk_score: number;
  risk_tier: string;
}

interface WifiSite {
  site_name: string;
  street_address: string;
  zip: string;
  council_district: string;
  census_tract_id: string;
  program_type: string;
  public_wifi_available: string;
  current_internet_speed: string;
  speed_down_mbps: number;
  speed_up_mbps: number;
  pct_hh_no_internet: number;
  pct_hh_broadband: number;
  lat: number;
  lng: number;
}

interface SignalMapProps {
  riskFilter: string;
  showWifi: boolean;
  onSelectTract?: (tract: SignalTract) => void;
  onSelectSite?: (site: WifiSite) => void;
}

function tractColor(score: number): string {
  if (score >= 80) return '#FF2D55';
  if (score >= 60) return '#FF6B35';
  if (score >= 40) return '#FFCC00';
  return '#00E5A0';
}

export default function SignalMap({ riskFilter, showWifi, onSelectTract, onSelectSite }: SignalMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const tractLayersRef = useRef<import('leaflet').Polygon[]>([]);
  const wifiMarkersRef = useRef<import('leaflet').CircleMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [tracts, setTracts] = useState<SignalTract[]>([]);
  const [wifiSites, setWifiSites] = useState<WifiSite[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!rootRef.current || mapRef.current) return;
    import('leaflet').then(L => {
      if (!rootRef.current || mapRef.current) return;
      const map = L.map(rootRef.current, {
        center: CENTER,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('© CARTO © OpenStreetMap')
        .addTo(map);

      mapRef.current = map;
      setReady(true);
    });

    return () => {
      tractLayersRef.current.forEach(layer => layer.remove());
      wifiMarkersRef.current.forEach(marker => marker.remove());
      mapRef.current?.remove();
      tractLayersRef.current = [];
      wifiMarkersRef.current = [];
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const [tractRes, siteRes] = await Promise.all([
          fetch('/api/signal/tracts?limit=500', { cache: 'no-store' }),
          fetch('/api/signal/sites?limit=600', { cache: 'no-store' }),
        ]);

        const [tractData, siteData] = await Promise.all([tractRes.json(), siteRes.json()]);
        if (cancelled) return;

        setTracts(tractData.tracts ?? []);
        setWifiSites(siteData.sites ?? []);
        setDataLoaded(true);
      } catch (err) {
        console.error('Signal map data load error', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  const filteredTracts = useMemo(() => {
    if (riskFilter === 'all') return tracts;
    return tracts.filter(tract => tract.risk_tier === riskFilter);
  }, [riskFilter, tracts]);

  useEffect(() => {
    if (!ready || !mapRef.current || !dataLoaded) return;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');

      tractLayersRef.current.forEach(layer => layer.remove());
      tractLayersRef.current = [];

      for (const tract of filteredTracts) {
        const geo = tract.geojson?.geometry;
        if (!geo) continue;

        let latlngs: [number, number][][] = [];
        if (geo.type === 'Polygon') {
          latlngs = (geo.coordinates as number[][][]).map(ring =>
            ring.map(point => [point[1], point[0]] as [number, number])
          );
        } else if (geo.type === 'MultiPolygon') {
          latlngs = (geo.coordinates as number[][][][]).flatMap(poly =>
            poly.map(ring => ring.map(point => [point[1], point[0]] as [number, number]))
          );
        }
        if (!latlngs.length) continue;

        const color = tractColor(Number(tract.risk_score || 0));
        const polygon = L.polygon(latlngs, {
          color,
          weight: 1.2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.2,
        }).addTo(mapRef.current!);

        const noInternet = Number(tract.pct_no_internet || 0);
        const noInternetPct = noInternet <= 1 ? noInternet * 100 : noInternet;
        polygon.bindTooltip(
          `${tract.name}${tract.place_label ? ` · ${tract.place_label}` : ''}<br/>Risk ${Math.round(Number(tract.risk_score || 0))}<br/>No internet ${noInternetPct.toFixed(1)}%`,
          { sticky: true, className: 'signal-tooltip' }
        );
        polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: 0.34, weight: 1.8 }));
        polygon.on('mouseout', () => polygon.setStyle({ fillOpacity: 0.2, weight: 1.2 }));
        polygon.on('click', () => onSelectTract?.(tract));
        tractLayersRef.current.push(polygon);
      }

      wifiMarkersRef.current.forEach(marker => marker.remove());
      wifiMarkersRef.current = [];

      if (!showWifi) return;

      for (const site of wifiSites) {
        const marker = L.circleMarker([site.lat, site.lng], {
          radius: 4.5,
          color: 'rgba(255,255,255,0.25)',
          weight: 0.8,
          fillColor: site.public_wifi_available === 'Y' ? '#7CD9FF' : '#FFCC00',
          fillOpacity: 0.92,
        }).addTo(mapRef.current!);
        marker.bindTooltip(
          `${site.site_name}<br/>${site.current_internet_speed || 'Speed unavailable'}<br/>${site.program_type}`,
          { sticky: true, className: 'signal-tooltip' }
        );
        marker.on('click', () => onSelectSite?.(site));
        wifiMarkersRef.current.push(marker);
      }
    })().catch(err => console.error('Signal map load error', err));

    return () => {
      cancelled = true;
    };
  }, [ready, dataLoaded, filteredTracts, showWifi, wifiSites, onSelectSite, onSelectTract]);

  return (
    <>
      <div ref={rootRef} className="absolute inset-0" />
      <style>{`
        .signal-tooltip {
          background: rgba(4, 13, 33, 0.96) !important;
          border: 1px solid rgba(124,217,255,0.28) !important;
          color: rgba(255,255,255,0.92) !important;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 11px !important;
          padding: 6px 8px !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35) !important;
        }
        .signal-tooltip::before { display: none !important; }
        .leaflet-control-zoom a {
          background: rgba(6, 18, 42, 0.92) !important;
          color: rgba(255,255,255,0.88) !important;
          border: 1px solid rgba(124,217,255,0.25) !important;
        }
        .leaflet-control-attribution {
          background: rgba(6, 18, 42, 0.82) !important;
          color: rgba(255,255,255,0.45) !important;
          font-size: 9px !important;
        }
      `}</style>
    </>
  );
}
