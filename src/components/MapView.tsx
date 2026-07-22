 import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Destination } from '../data/destinations';

interface Props {
  destinations: Destination[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMapReady: (map: L.Map) => void;
  onDiscover?: (id: string) => void;
}

function createIcon(emoji: string, color: string, isMinor: boolean): L.DivIcon {
  return L.divIcon({
    className: isMinor ? 'neon-marker-minor' : 'neon-marker',
    html: `<div style="color:${color};font-size:${isMinor ? '14px' : '22px'};">${emoji}</div>`,
    iconSize: isMinor ? [28, 28] : [40, 40],
    iconAnchor: isMinor ? [14, 14] : [20, 20],
    popupAnchor: isMinor ? [0, -20] : [0, -28],
  });
}

function popupHtml(d: Destination): string {
  const tag = d.isMinor
    ? `<div style="font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:2px;color:rgba(0,229,255,0.4);text-transform:uppercase;margin-bottom:8px;">⚡ POI MINORE</div>`
    : '';
  return `
    <div class="vc-popup">
      ${tag}
      <div class="vc-popup-title">${d.name}</div>
      <div class="vc-popup-zone">${d.zone} &middot; ${d.subtitle}</div>
      <div class="stat-row">
        <div class="stat-label">RISPETTO <span>${d.stats.rispetto}%</span></div>
        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${d.stats.rispetto}%;background:linear-gradient(90deg, #ff2d78, #ff6b00);"></div></div>
      </div>
      <div class="stat-row">
        <div class="stat-label">NOTORIETÀ <span>${d.stats.notorieta}%</span></div>
        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${d.stats.notorieta}%;background:linear-gradient(90deg, #00e5ff, #2979ff);"></div></div>
      </div>
      <div class="stat-row">
        <div class="stat-label">CONTROLLO <span>${d.stats.controllo}%</span></div>
        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${d.stats.controllo}%;background:linear-gradient(90deg, #ffd600, #ff6d00);"></div></div>
      </div>
      
    </div>
  `;
}

export default function MapView({ destinations, activeId, onSelect, onMapReady, onDiscover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const beaconsRef = useRef<Record<string, L.Layer>>({});
  const playerMarkerRef = useRef<L.Marker | null>(null);
  const playerOverlayRef = useRef<L.Circle | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealedRef = useRef<Array<{ lat: number; lng: number; radius: number }>>([]);
  const discoveredRef = useRef<Set<string>>(new Set());
  const discoveredKeyRef = useRef<string>('');
  const deviceKeyRef = useRef<string | null>(null);
  const playerIcon = L.icon({
    iconUrl: 'player_icon.png',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Bounds lock the map to Rimini → Riccione corridor
    const BOUNDS = L.latLngBounds(
      L.latLng(43.92, 12.48), // SW - molto ampio per permettere zoom fluido
      L.latLng(44.13, 12.72)  // NE
    );

    const map = L.map(containerRef.current, {
      center: [44.031, 12.603],
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
      keyboard: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19 }
    ).addTo(map);

    // Setup canvas overlay — FISSO, NON nel pane della mappa (come GTA V)
    // Non si muove con zoom/pan, rimane sempre uguale sullo schermo
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '360';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    // device id for per-device discovery
    let deviceId = localStorage.getItem('vc_device_id');
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      localStorage.setItem('vc_device_id', deviceId);
    }
    deviceKeyRef.current = `vc_discovery_${deviceId}`;
    discoveredKeyRef.current = `vc_discovered_${deviceId}`;

    // load saved revealed areas
    const saved = localStorage.getItem(deviceKeyRef.current);
    if (saved) {
      try { revealedRef.current = JSON.parse(saved); } catch (e) { revealedRef.current = []; }
    }

    // load saved discovered destinations
    const savedDiscovered = localStorage.getItem(discoveredKeyRef.current);
    if (savedDiscovered) {
      try {
        const parsed = JSON.parse(savedDiscovered) as string[];
        parsed.forEach((id) => discoveredRef.current.add(id));
        parsed.forEach((id) => onDiscover?.(id));
      } catch (e) {
        // ignore invalid saved state
      }
    }

    const resizeCanvas = () => {
      if (!canvasRef.current || !mapRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = map.getSize();
      canvasRef.current.width = rect.x * dpr;
      canvasRef.current.height = rect.y * dpr;
      canvasRef.current.style.width = rect.x + 'px';
      canvasRef.current.style.height = rect.y + 'px';
      drawFog();
    };

    const metersToPixels = (lat: number, meters: number) => {
      const latRad = (lat * Math.PI) / 180;
      const metersPerDegLon = 111320 * Math.cos(latRad);
      const deltaLng = meters / metersPerDegLon;
      const p1 = map.latLngToContainerPoint([lat, 0]);
      const p2 = map.latLngToContainerPoint([lat, deltaLng]);
      return Math.abs(p2.x - p1.x);
    };

    const calcExploredPercent = (): number => {
      // Calcola l'area totale della mappa (bounds)
      const bounds = map.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const totalLat = ne.lat - sw.lat;
      const totalLng = ne.lng - sw.lng;
      const totalArea = totalLat * totalLng;

      // Calcola l'area totale rivelata (somma dei cerchi)
      let exploredArea = 0;
      // Stima: ogni raggio in gradi = radius / 111320
      revealedRef.current.forEach((area) => {
        const rDeg = area.radius / 111320;
        const circleArea = Math.PI * rDeg * rDeg;
        exploredArea += circleArea;
      });

      // Cap a 100%
      const pct = Math.min(100, Math.round((exploredArea / totalArea) * 100));
      return pct;
    };

    // Emetti evento per l'HUD ogni volta che la percentuale cambia
    const markDiscovered = (id: string) => {
      if (discoveredRef.current.has(id)) return;
      discoveredRef.current.add(id);
      try { localStorage.setItem(discoveredKeyRef.current || '', JSON.stringify(Array.from(discoveredRef.current))); } catch (e) {}
      onDiscover?.(id);
    };

    const emitExplorePct = () => {
      const pct = calcExploredPercent();
      try { window.dispatchEvent(new CustomEvent('vc:explorepct', { detail: { pct } })); } catch (e) {}
    };

    const drawFog = () => {
      const c = canvasRef.current;
      if (!c || !mapRef.current) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, c.width, c.height);

      // Overlay scura con sfumatura leggera per lasciare un effetto foschia.
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(0, 0, c.width, c.height);

      // Leggera texture speckle per dare profondità al nero
      const speckles = Math.max(400, (c.width * c.height) / 10000 | 0);
      ctx.fillStyle = 'rgba(10, 5, 30, 0.03)';
      for (let i = 0; i < speckles; i++) {
        const x = Math.random() * c.width;
        const y = Math.random() * c.height;
        const s = (Math.random() * 2 + 0.5) * dpr;
        ctx.fillRect(x, y, s, s);
      }

      // Graduale dissolvenza per le aree rivelate, non buchi netti.
      ctx.globalCompositeOperation = 'destination-out';
      revealedRef.current.forEach((area) => {
        const pt = map.latLngToContainerPoint([area.lat, area.lng]);
        const px = pt.x * dpr;
        const py = pt.y * dpr;
        const radiusPx = Math.max(12, metersToPixels(area.lat, area.radius) * dpr);
        const grd = ctx.createRadialGradient(px, py, 0, px, py, radiusPx);
        grd.addColorStop(0, 'rgba(0,0,0,0.95)');
        grd.addColorStop(0.35, 'rgba(0,0,0,0.72)');
        grd.addColorStop(0.7, 'rgba(0,0,0,0.38)');
        grd.addColorStop(1, 'rgba(0,0,0,0.08)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    };

    // redraw ONLY on window resize — MAI durante zoom/pan (come GTA V)
    // La nebbia rimane FISSA sullo schermo, non segue la mappa
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 200);

    // listen for external reveal events (from HUD geolocation)
    const onRevealEvent = (ev: Event) => {
      const e = ev as CustomEvent<{ lat: number; lng: number; radius?: number }>;
      const { lat, lng, radius = 80 } = e.detail;
      revealedRef.current.push({ lat, lng, radius });
      try { localStorage.setItem(deviceKeyRef.current || '', JSON.stringify(revealedRef.current)); } catch (e) {}
      drawFog();
      revealAround(lat, lng, radius);
      emitExplorePct();
    };
    window.addEventListener('vc:reveal', onRevealEvent as EventListener);

    const onPlayerPos = (ev: Event) => {
      const e = ev as CustomEvent<{ lat: number; lng: number }>;
      const { lat, lng } = e.detail;
      if (!mapRef.current) return;
      if (playerMarkerRef.current) {
        playerMarkerRef.current.setLatLng([lat, lng]);
      } else {
        playerMarkerRef.current = L.marker([lat, lng], { icon: playerIcon, zIndexOffset: 1200 }).addTo(map);
      }
      if (playerOverlayRef.current) {
        playerOverlayRef.current.setLatLng([lat, lng]);
      } else {
        playerOverlayRef.current = L.circle([lat, lng], {
          radius: 40,
          color: '#76ff03',
          fillColor: 'rgba(118,255,3,0.18)',
          weight: 1,
          interactive: false,
        }).addTo(map);
      }

      // Rileva i posti vicini mentre il player si muove.
      destinations.forEach((d) => {
        if (discoveredRef.current.has(d.id)) return;
        const dist = map.distance([lat, lng], d.coords);
        const revealRadius = d.isMinor ? 140 : 220;
        if (dist <= revealRadius) {
          markDiscovered(d.id);
          animateReveal(d.coords[0], d.coords[1], revealRadius);
        }
      });
    };
    window.addEventListener('vc:playerpos', onPlayerPos as EventListener);

    const onPlayerOff = () => {
      if (playerMarkerRef.current) {
        playerMarkerRef.current.remove();
        playerMarkerRef.current = null;
      }
      if (playerOverlayRef.current) {
        playerOverlayRef.current.remove();
        playerOverlayRef.current = null;
      }
    };
    window.addEventListener('vc:playeroff', onPlayerOff as EventListener);

    const onReset = () => {
      revealedRef.current = [];
      discoveredRef.current.clear();
      try {
        localStorage.removeItem(deviceKeyRef.current || '');
        localStorage.removeItem(discoveredKeyRef.current || '');
        localStorage.removeItem('vc_seen_initial_v2');
      } catch (e) {
        // ignore
      }
      drawFog();
      Object.values(markersRef.current).forEach((marker) => {
        try {
          const el = (marker as any).getElement?.();
          if (el) {
            el.classList.add('poi-hidden');
            el.classList.remove('poi-pop');
          }
        } catch (e) {
          // ignore
        }
      });
      Object.values(beaconsRef.current).forEach((beacon) => {
        try {
          const el = (beacon as any).getElement?.();
          if (el) {
            el.classList.add('poi-hidden');
            el.classList.remove('beacon-pop');
          }
        } catch (e) {
          // ignore
        }
      });
    };
    window.addEventListener('vc:reset', onReset as EventListener);

    const animateReveal = (lat: number, lng: number, targetRadius = 140) => {
      const start = performance.now();
      const dur = 800; // slightly slower for more dramatic effect
      const initial = 8;
      const step = (t: number) => {
        const now = t - start;
        const progress = Math.min(1, now / dur);
        const eased = 1 - Math.pow(1 - progress, 3);
        const c = canvasRef.current;
        if (!c || !mapRef.current) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        drawFog();
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const pt = map.latLngToContainerPoint([lat, lng]);
        const px = pt.x * dpr;
        const py = pt.y * dpr;
        const r = initial + eased * (targetRadius - initial);
        const radiusPx = Math.max(12, metersToPixels(lat, r) * dpr);
        const grd = ctx.createRadialGradient(px, py, radiusPx * 0.1, px, py, radiusPx);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (progress < 1) requestAnimationFrame(step);
        else revealAround(lat, lng, targetRadius);
      };
      requestAnimationFrame(step);
    };

    const revealAround = (lat: number, lng: number, radius = 140) => {
      // finalize the reveal (make permanent)
      revealedRef.current.push({ lat, lng, radius });
      try { localStorage.setItem(deviceKeyRef.current || '', JSON.stringify(revealedRef.current)); } catch (e) {}
      drawFog();
      emitExplorePct();
      // reveal markers within radius with pop animation
      Object.keys(markersRef.current).forEach((id) => {
        const m = markersRef.current[id];
        try {
          const latlng = m.getLatLng();
          const distMeters = map.distance([lat, lng], latlng);
          if (distMeters <= radius + 60) {
            const el = (m as any).getElement?.();
            if (el) {
              el.classList.remove('poi-hidden');
              el.classList.add('poi-pop');
              setTimeout(() => el.classList.remove('poi-pop'), 900);
            }
            markDiscovered(id);
          }
        } catch (e) {}
      });
      // reveal beacons (small markers) too
      Object.keys(beaconsRef.current).forEach((id) => {
        const b = beaconsRef.current[id];
        try {
          const latlng = (b as any).getLatLng();
          const dx = latlng.lat - lat;
          const dy = latlng.lng - lng;
          const distMeters = Math.sqrt(dx * dx + dy * dy) * 111320;
          if (distMeters <= radius + 80) {
            const bel = (b as any).getElement?.();
            if (bel) {
              bel.classList.remove('poi-hidden');
              bel.classList.add('beacon-pop');
              setTimeout(() => bel.classList.remove('beacon-pop'), 900);
            }
          }
        } catch (e) {}
      });
    };

    destinations.forEach((d) => {
      const iconEmoji = d.id === 'rivazzurra' ? '🏠' : d.icon;
      const marker = L.marker(d.coords, { icon: createIcon(iconEmoji, d.color, d.isMinor || false) }).addTo(map);
      marker.bindPopup(popupHtml(d), {
        maxWidth: 320,
        closeButton: true,
        autoPan: true,
      });
      marker.on('popupopen', () => onSelect(d.id));
      marker.on('click', () => {
        marker.openPopup();
        onSelect(d.id);
      });
      // hide marker element initially (will pop when revealed)
      setTimeout(() => {
        try {
          const el = (marker as any).getElement?.();
          if (el) el.classList.add('poi-hidden');
        } catch (e) {}
      }, 0);
      markersRef.current[d.id] = marker;
      // create a small beacon for each destination (hidden until reveal)
      try {
        const beacon = L.circleMarker(d.coords, {
          radius: d.isMinor ? 5 : 8,
          color: d.color,
          fillColor: d.color,
          fillOpacity: 1,
          weight: 1,
          className: 'vc-beacon poi-hidden',
          interactive: false,
        }).addTo(map);
        beaconsRef.current[d.id] = beacon;
      } catch (e) {}
    });

    // initial auto-reveal for main towns on first visit
    try {
      const seenKey = 'vc_seen_initial_v2';
      const seen = localStorage.getItem(seenKey);
      if (!seen && (!revealedRef.current || revealedRef.current.length === 0)) {
        const initialOrder = ['rivazzurra', 'riccione-ceccarini', 'rimini-porto'];
        const radiiMap: Record<string, number> = { rivazzurra: 340, 'riccione-ceccarini': 460, 'rimini-porto': 340 };
        initialOrder.forEach((id, idx) => {
          const m = markersRef.current[id];
          if (m) {
            const ll = m.getLatLng();
            const r = radiiMap[id] || 260;
            setTimeout(() => {
              animateReveal(ll.lat, ll.lng, r);
            }, idx * 500 + 220);
          }
        });
        localStorage.setItem(seenKey, '1');
      }
    } catch (e) {}

    // Click sulla mappa DISABILITATO: il gioco richiede GPS obbligatorio

    mapRef.current = map;
    onMapReady(map);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    setTimeout(onResize, 200);

    return () => {
      window.removeEventListener('resize', onResize);
      map.off('move zoom resize', resizeCanvas);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('vc:reveal', onRevealEvent as EventListener);
      window.removeEventListener('vc:playerpos', onPlayerPos as EventListener);
      window.removeEventListener('vc:playeroff', onPlayerOff as EventListener);
      if (playerMarkerRef.current) {
        playerMarkerRef.current.remove();
        playerMarkerRef.current = null;
      }
      if (playerOverlayRef.current) {
        playerOverlayRef.current.remove();
        playerOverlayRef.current = null;
      }
      try { canvasRef.current?.remove(); } catch (e) {}
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id="map-container" ref={containerRef} />;
}