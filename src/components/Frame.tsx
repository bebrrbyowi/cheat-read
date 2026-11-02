import { useEffect, useState } from 'react';

/* Кадр 390×844 из макета. Внутри всё стоит на тех же координатах, что в макете,
   а сам кадр пропорционально масштабируется под экран. */
export function Frame({ children, bg = '#FCFBF8', color = '#161513' }: { children: React.ReactNode; bg?: string; color?: string }) {
  const calc = () => Math.min(window.innerWidth / 390, window.innerHeight / 844);
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', transition: 'background .35s ease' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 390, height: 844, marginLeft: -195, marginTop: -422, transform: `scale(${s})`, color, fontFamily: "'Inter Tight', system-ui, sans-serif" }}>
        {children}
      </div>
    </div>
  );
}
