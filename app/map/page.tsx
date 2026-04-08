'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Sidebar, { type LayerKey, type LayerConfig } from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';
import StatsBar from '@/components/StatsBar';
import ChatDrawer from '@/components/ChatDrawer';

const PhillyMap = dynamic(() => import('@/components/PhillyMap'), { ssr: false });
const LoadingScreen = dynamic(() => import('@/components/LoadingScreen'), { ssr: false });

const INITIAL_LAYERS: LayerConfig[] = [
  { key: 'vacant_parcels', label: 'Vacant Parcels', icon: '🏚', color: '#B13BFF', enabled: false, opacity: 1 },
  { key: 'blight_scores', label: 'Blight Risk Scores', icon: '⚠️', color: '#FF6B35', enabled: true, opacity: 0.9 },
  { key: 'neighborhoods', label: 'Neighborhood Bounds', icon: '🗺', color: '#471396', enabled: true, opacity: 0.6 },
  { key: 'violations', label: 'Code Violations', icon: '🔴', color: '#FF2D55', enabled: false, opacity: 0.8 },
];

interface SelectedProperty {
  id: number;
  parcel_id: string;
  address: string;
  owner?: string;
  lat: number;
  lng: number;
  market_value?: number;
  total_area?: number;
  zip_code?: string;
  blight_score: number;
  category?: string;
  violations?: Array<{
    violation_id: string;
    violation_type: string;
    violation_date?: string;
    status?: string;
    description?: string;
  }>;
}

export default function Home() {
  const [appReady, setAppReady] = useState(false);
  const [layers, setLayers] = useState<LayerConfig[]>(INITIAL_LAYERS);
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState<SelectedProperty | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [lastIngestion, setLastIngestion] = useState<string>('');

  const handleLayerToggle = useCallback((key: LayerKey) => {
    setLayers(prev => prev.map(l => l.key === key ? { ...l, enabled: !l.enabled } : l));
  }, []);

  const handleOpacityChange = useCallback((key: LayerKey, opacity: number) => {
    setLayers(prev => prev.map(l => l.key === key ? { ...l, opacity } : l));
  }, []);

  const handlePropertySelect = useCallback((property: SelectedProperty) => {
    setSelectedProperty(property);
    setSelectedNeighborhood(null);
  }, []);

  const handleNeighborhoodSelect = useCallback((name: string) => {
    setSelectedNeighborhood(name);
    setSelectedProperty(null);
  }, []);

  const handlePanelClose = useCallback(() => {
    setSelectedProperty(null);
    setSelectedNeighborhood(null);
  }, []);

  const handleAddressSelect = useCallback((_address: string, lat: number, lng: number) => {
    setFlyTo({ lat, lng });
    setTimeout(() => setFlyTo(null), 1000);
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setAppReady(true);
    fetch('/api/stats').then(r => r.json()).then(data => {
      if (data.last_ingestion) setLastIngestion(data.last_ingestion);
    }).catch(() => {});
  }, []);

  const mapContext = `Active layers: ${layers.filter(l => l.enabled).map(l => l.label).join(', ')}. Risk filter: ${riskFilter}.`;

  return (
    <main className="map-viewport w-full">
      {!appReady && <LoadingScreen onComplete={handleLoadingComplete} />}

      {appReady && (
        <PhillyMap
          layers={layers}
          riskFilter={riskFilter}
          onPropertySelect={handlePropertySelect}
          onNeighborhoodSelect={handleNeighborhoodSelect}
          flyTo={flyTo}
        />
      )}

      {appReady && (
        <>
          <Navbar onAddressSelect={handleAddressSelect} lastIngestion={lastIngestion} />
          <Sidebar
            layers={layers}
            onLayerToggle={handleLayerToggle}
            onOpacityChange={handleOpacityChange}
            riskFilter={riskFilter}
            onRiskFilterChange={setRiskFilter}
          />
          <DetailPanel
            property={selectedProperty}
            neighborhood={selectedNeighborhood}
            onClose={handlePanelClose}
          />
          <StatsBar onOpenChat={() => setChatOpen(true)} />
          <ChatDrawer
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            mapContext={mapContext}
          />
        </>
      )}
    </main>
  );
}
