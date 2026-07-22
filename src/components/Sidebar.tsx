import { useState } from 'react';
import type { Destination } from '../data/destinations';

interface Props {
  destinations: Destination[];
  activeId: string | null;
  discoveredIds: string[];
  explorePct: number;
  onSelect: (id: string) => void;
}

export default function Sidebar({ destinations, activeId, discoveredIds, explorePct, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const discovered = destinations.filter((dest) => discoveredIds.includes(dest.id));
  const hiddenCount = destinations.length - discovered.length;

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setOpen((prev) => !prev)}>
        {open ? 'CHIUDI' : 'INFO MAPPA'}
      </button>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-header">▷ COSTIERA ROMAGNOLA · ESTATE 2026</div>
          <div className="sidebar-copy">
            {discovered.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.7 }}>
                <span style={{ color: '#ff1493', textShadow: '0 0 8px rgba(255,20,147,0.5)' }}>☀️ COSTIERA ROMAGNOLA ☀️</span>
                <br /><br />
                Attiva la geolocalizzazione e passa lentamente intorno ai punti di interesse per rivelarli.
                <br />
                I luoghi scoperti appariranno qui in <strong style={{ color: '#76ff03' }}>INFO MAPPA</strong>.
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#00e5ff' }}>Posti scoperti</div>
                  <div style={{ fontSize: 12, color: '#76ff03' }}>{discovered.length}/{destinations.length}</div>
                </div>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#00e5ff', marginBottom: 6 }}>Esplorazione</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', textShadow: '0 0 14px rgba(0,229,255,0.35)', marginBottom: 6 }}>{explorePct}%</div>
                <div className="destinations-list">
                  {discovered.map((dest) => (
                    <div
                      key={dest.id}
                      className={`dest-item ${activeId === dest.id ? 'active' : ''}`}
                      onClick={() => {
                        onSelect(dest.id);
                        setOpen(false);
                      }}
                    >
                      <div className="dest-name">{dest.name}</div>
                      <div className="dest-tag">{dest.zone}</div>
                      <div className="dest-coords">{dest.coords[0].toFixed(4)}, {dest.coords[1].toFixed(4)}</div>
                    </div>
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                    Ancora {hiddenCount} posti da scoprire con la posizione attiva.
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="poster-section">
            <div style={{ marginBottom: 8, fontFamily: 'Orbitron', fontSize: 9, letterSpacing: 2, color: 'rgba(255,20,147,0.5)', textTransform: 'uppercase' }}>
              ⚡ POSTER UFFICIALE
            </div>
            <img src="poster.png" alt="Poster" className="poster-img" />
          </div>
        </div>
      </aside>
    </>
  );
}
