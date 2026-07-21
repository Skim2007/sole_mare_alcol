import { useEffect, useMemo, useState } from 'react';

interface Props {
  target?: string | Date; // target date as local Date or parsable string
  enabled?: boolean;
  onComplete?: () => void;
}

export default function Countdown({ target, enabled = false, onComplete }: Props) {
  const [remaining, setRemaining] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(true);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

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
        }}>
          La mappa sarà disponibile il <strong>22 luglio 2026 alle 15:30</strong>.
          Torna su questo link e la scoperta si attiverà automaticamente.
        </div>
      </div>
    </div>
  );
}