import { useState, useEffect } from 'react';

export default function HUD() {
  const [time, setTime] = useState(new Date());
  const [watchId, setWatchId] = useState<number | null>(null);
  const [exploredPct, setExploredPct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<{ pct: number }>;
      setExploredPct(e.detail.pct);
    };
    window.addEventListener('vc:explorepct', handler as EventListener);
    return () => window.removeEventListener('vc:explorepct', handler as EventListener);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');

  return (
    <>
      <div className="hud-top">
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '14px', paddingBottom: '20px' }}>
          <h1 className="main-title" style={{ fontSize: '30px' }}>SOLE · MARE · ALCOL</h1>
        </div>
      </div>
      <div className="radio-hud">♪ RADIO ROMAGNA · 88.3 FM</div>
      <button
        className="discover-btn"
        onClick={() => {
          if (watchId != null) {
            navigator.geolocation.clearWatch(watchId);
            window.dispatchEvent(new CustomEvent('vc:playeroff'));
            setWatchId(null);
            return;
          }
          if (!navigator.geolocation) {
            alert('Geolocalizzazione non supportata.\n\nUsa il click sulla mappa per esplorare: clicca su un punto qualsiasi per simulare la posizione e rivelare l\'area intorno.');
            return;
          }
          const id = navigator.geolocation.watchPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const acc = pos.coords.accuracy || 80;
              window.dispatchEvent(new CustomEvent('vc:playerpos', { detail: { lat, lng } }));
              window.dispatchEvent(new CustomEvent('vc:reveal', { detail: { lat, lng, radius: Math.max(80, acc) } }));
            },
            (err) => {
              console.warn('Geolocation error', err);
              if (err.code === 1) {
                alert('Permesso posizione negato.\n\nIl GPS richiede HTTPS (non HTTP).\n\n👉 ALTERNATIVA: Clicca direttamente sulla mappa per esplorare! Ogni click rivela l\'area intorno e mostra il tuo puntatore.');
              } else {
                alert('Errore geolocalizzazione: ' + err.message + '\n\n👉 Clicca sulla mappa per esplorare lo stesso!');
              }
            },
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
          );
          setWatchId(id as unknown as number);
        }}
      >
        {watchId ? '⏹ Esplorazione' : '📍 Esplora zona'}
      </button>
      <div className="coords-hud">
        {hh}:{mm} · ADR-SEA · SAT-LINK · 30°C · ☀️ · MAPPA <span style={{color:'#76ff03', textShadow:'0 0 8px #76ff03'}}>{exploredPct}%</span>
      </div>

      <div className="romagna-palm romagna-palm-1">🌴</div>
      <div className="romagna-palm romagna-palm-2">🌴</div>
      <div className="romagna-palm romagna-palm-3">🌴</div>
      <div className="romagna-palm romagna-palm-4">🌴</div>

      <div className="romagna-sunset-strip" />

      <div className="crt-overlay" />
      <div className="vignette-overlay" />
    </>
  );
}