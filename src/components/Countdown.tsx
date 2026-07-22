import { useEffect, useMemo, useState } from 'react';

interface Props {
  target?: string | Date;
  enabled?: boolean;
  onComplete?: () => void;
}

export default function Countdown({ target, enabled = false, onComplete }: Props) {
  const [remaining, setRemaining] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(true);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [watchId, setWatchId] = useState<number | null>(null);
  const [geoOk, setGeoOk] = useState<boolean>(false);

  const targetDate = useMemo(() => {
    if (!target) return null;
    return target instanceof Date ? target : new Date(target);
  }, [target]);

  useEffect(() => {
    if (!enabled || !targetDate) return;
    const tick = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      setRemaining(diff);
      if (diff === 0) {
        setCompleted(true);
        setVisible(false);
        onComplete?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, targetDate, onComplete]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      setPointer({ x: event.clientX, y: event.clientY });
    };
    const onTouch = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        setPointer({ x: event.touches[0].clientX, y: event.touches[0].clientY });
      }
    };
    window.addEventListener('mousemove', onPointer);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onPointer);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  // GPS activation during countdown
  useEffect(() => {
    if (!enabled) return;
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<{ lat: number; lng: number }>;
      const { lat, lng } = e.detail;
      window.dispatchEvent(new CustomEvent('vc:playerpos', { detail: { lat, lng } }));
      window.dispatchEvent(new CustomEvent('vc:reveal', { detail: { lat, lng, radius: 120 } }));
    };
    window.addEventListener('vc:reveal', handler as EventListener);
    return () => window.removeEventListener('vc:reveal', handler as EventListener);
  }, [enabled]);

  const startGeo = () => {
    if (!navigator.geolocation) {
      alert('Geolocalizzazione non supportata.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 80;
        setGeoOk(true);
        window.dispatchEvent(new CustomEvent('vc:playerpos', { detail: { lat, lng } }));
        window.dispatchEvent(new CustomEvent('vc:reveal', { detail: { lat, lng, radius: Math.max(80, acc) } }));
      },
      (err) => {
        console.warn('Geolocation error', err);
        if (err.code === 1) {
          alert('Permesso posizione negato.\n\nIl GPS richiede HTTPS.\n\n👉 In alternativa, dopo lo sblocco potrai cliccare direttamente sulla mappa.');
        } else {
          alert('Errore geolocalizzazione: ' + err.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    );
    setWatchId(id as unknown as number);
  };

  const stopGeo = () => {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      window.dispatchEvent(new CustomEvent('vc:playeroff'));
      setWatchId(null);
      setGeoOk(false);
    }
  };

  if (!enabled || !targetDate || !visible) return null;

  const secs = Math.floor(remaining / 1000) % 60;
  const mins = Math.floor(remaining / (1000 * 60)) % 60;
  const hours = Math.floor(remaining / (1000 * 60 * 60)) % 24;
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));

  const label = completed ? 'ATTIVATA! La mappa si sblocca ora.' : 'LANCIO IN CORSO';

  const offsetX = (pointer.x - window.innerWidth / 2) * 0.08;
  const offsetY = (pointer.y - window.innerHeight / 2) * 0.08;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(5, 2, 30, 0.98) 0%, rgba(0, 0, 0, 0.99) 100%)',
      color: '#fff',
      fontFamily: 'Orbitron, sans-serif',
      textAlign: 'center',
      pointerEvents: 'none',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div style={{
          fontSize: 'clamp(18px, 5vw, 28px)',
          letterSpacing: 'clamp(4px, 1.5vw, 8px)',
          textTransform: 'uppercase',
          opacity: 1,
          marginBottom: 18,
          color: '#ff66cc',
          textShadow: '0 0 18px rgba(255, 102, 204, 0.85), 0 0 42px rgba(0, 255, 246, 0.35)',
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          transition: 'transform 0.1s ease-out',
        }}>
          SOLE · MARE · ALCOL
        </div>
        <div style={{
          fontSize: 'clamp(11px, 2.5vw, 16px)',
          letterSpacing: 'clamp(1px, 0.5vw, 2px)',
          textTransform: 'uppercase',
          opacity: 0.8,
          marginBottom: 12,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 'clamp(28px, 8vw, 64px)',
          fontWeight: 900,
          letterSpacing: 'clamp(3px, 1vw, 6px)',
          lineHeight: 1.05,
          marginBottom: 10,
          color: '#fff',
          textShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
        }}>
          {completed ? '00d 00h 00m 00s' : `${days}d ${hours}h ${mins}m ${secs}s`}
        </div>
        <div style={{
          fontSize: 'clamp(11px, 2vw, 16px)',
          opacity: 0.75,
          lineHeight: 1.6,
          padding: '0 12px',
          marginBottom: 18,
        }}>
          La mappa sarà disponibile il <strong>22 luglio 2026 alle 15:30</strong>.
          <br />
          Attiva il GPS adesso per essere pronto fin dal primo istante.
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          {!watchId ? (
            <button
              onClick={startGeo}
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                padding: '12px 18px',
                borderRadius: 999,
                border: '1px solid rgba(255,20,147,0.6)',
                color: '#fff',
                background: 'rgba(0,0,0,0.6)',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              }}
            >
              📍 Attiva GPS
            </button>
          ) : (
            <button
              onClick={stopGeo}
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 'clamp(11px, 2vw, 13px)',
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid rgba(118,255,3,0.5)',
                color: '#76ff03',
                background: 'rgba(0,0,0,0.6)',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              }}
            >
              {geoOk ? '✓ GPS attivo — Chiudi' : '⏹ Chiudi GPS'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}