import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import HUD from './components/HUD';
import Countdown from './components/Countdown';
import { DESTINATIONS } from './data/destinations';

export default function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [explorePct, setExplorePct] = useState(0);
  const mapRef = useRef<L.Map | null>(null);

  // Check localStorage per lo stato di sblocco
  useEffect(() => {
    const saved = localStorage.getItem('vc_unlocked');
    if (saved === 'true') {
      setUnlocked(true);
    }
  }, []);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const handleDiscover = useCallback((id: string) => {
    setDiscoveredIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  useEffect(() => {
    const h = (ev: Event) => {
      const e = ev as CustomEvent<{ pct: number }>;
      setExplorePct(e.detail.pct);
    };
    window.addEventListener('vc:explorepct', h as EventListener);
    return () => window.removeEventListener('vc:explorepct', h as EventListener);
  }, []);

  useEffect(() => {
    const resetHandler = () => setDiscoveredIds([]);
    window.addEventListener('vc:reset', resetHandler as EventListener);
    return () => window.removeEventListener('vc:reset', resetHandler as EventListener);
  }, []);

  const handleUnlock = useCallback(() => {
    localStorage.setItem('vc_unlocked', 'true');
    setUnlocked(true);
    // Reveal all main destinations con un delay per drammaticità
    const mainIds = ['rivazzurra', 'riccione-ceccarini', 'rimini-porto'];
    mainIds.forEach((id, idx) => {
      setTimeout(() => {
        const d = DESTINATIONS.find((x) => x.id === id);
        if (d) {
          window.dispatchEvent(new CustomEvent('vc:reveal', {
            detail: {
              lat: d.coords[0],
              lng: d.coords[1],
              radius: id === 'riccione-ceccarini' ? 460 : 340,
            },
          }));
        }
      }, idx * 600 + 300);
    });
  }, []);

  const flyToDestination = useCallback((id: string) => {
    const d = DESTINATIONS.find((x) => x.id === id);
    if (!d || !mapRef.current) return;
    setActiveId(id);
    mapRef.current.flyTo(d.coords, d.zoom, { duration: 1.6, easeLinearity: 0.25 });
    const markerEl = document.querySelector(`.neon-marker`);
    void markerEl;
    // Open popup after flight completes
    setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      // Re-find marker by its location is complex; instead dispatch via layer lookup
      map.eachLayer((layer) => {
        if (L.Marker && layer instanceof L.Marker) {
          const latlng = layer.getLatLng();
          if (Math.abs(latlng.lat - d.coords[0]) < 0.0001 && Math.abs(latlng.lng - d.coords[1]) < 0.0001) {
            layer.openPopup();
          }
        }
      });
      // Also reveal area on flyTo (simulate map discovery)
      try { window.dispatchEvent(new CustomEvent('vc:reveal', { detail: { lat: d.coords[0], lng: d.coords[1], radius: 160 } })); } catch (e) {}
    }, 1700);
  }, []);

  const handleSelect = useCallback((id: string) => {
    flyToDestination(id);
  }, [flyToDestination]);

  // ESC closes popups
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        mapRef.current?.closePopup();
        setActiveId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click outside popup closes it
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.vc-popup') || target.closest('.leaflet-popup') || target.closest('.dest-item')) return;
      mapRef.current?.closePopup();
      setActiveId(null);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  // Se non ancora sbloccato, mostra solo il countdown
  if (!unlocked) {
    return (
      <Countdown
        enabled={true}
        target={new Date('2026-07-22T15:30:00+02:00')}
        onComplete={handleUnlock}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="vicecity-overlay" />
      <MapView
        destinations={DESTINATIONS}
        activeId={activeId}
        onSelect={handleSelect}
        onMapReady={handleMapReady}
        onDiscover={handleDiscover}
      />
      <Sidebar
        destinations={DESTINATIONS}
        activeId={activeId}
        discoveredIds={discoveredIds}
        explorePct={explorePct}
        onSelect={handleSelect}
      />
      <HUD />
    </div>
  );
}