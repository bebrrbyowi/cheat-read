import { useRef } from 'react';

// Пологая дуга для выбора длительности быстрой сессии: 5–15 мин на левой половине, 15–30 на правой.
const CX = 180, CY = 148, RX = 156, RY = 80, T0 = 196, T1 = -16;
const P = (th: number) => { const r = (th * Math.PI) / 180; return [CX + RX * Math.cos(r), CY - RY * Math.sin(r)]; };
const N = (th: number) => { const r = (th * Math.PI) / 180; const nx = RY * Math.cos(r), ny = -RX * Math.sin(r); const l = Math.hypot(nx, ny); return [nx / l, ny / l]; };
const thOf = (t: number) => T0 - t * (T0 - T1);
const tOf = (v: number) => (v <= 15 ? (v - 5) / 20 : 0.5 + (v - 15) / 30);
const vOf = (t: number) => Math.round(t <= 0.5 ? 5 + (t / 0.5) * 10 : 15 + ((t - 0.5) / 0.5) * 15);
const path = (t0: number, t1: number) => {
  let d = '';
  for (let i = 0; i <= 48; i++) { const p = P(thOf(t0 + ((t1 - t0) * i) / 48)); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
  return d;
};

export function ArcDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef(false);
  const fromEvent = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 360, y = ((e.clientY - r.top) / r.height) * 200;
    const u = (x - CX) / RX, v = (CY - y) / RY;
    let th = (Math.atan2(v, u) * 180) / Math.PI;
    if (th < -90) th += 360;
    return { th, d: Math.hypot(u, v) };
  };
  const set = (th: number) => {
    const t = Math.max(0, Math.min(1, (T0 - th) / (T0 - T1)));
    const v = vOf(t);
    if (v !== value) onChange(v);
  };
  const tm = tOf(value);
  const kp = P(thOf(tm));
  let ticks = '';
  const labels: [number, number, string][] = [];
  for (let k = 0; k <= 8; k++) {
    const th = thOf(k / 8), p = P(th), n = N(th), big = k % 4 === 0;
    const a = [p[0] - n[0] * 7, p[1] - n[1] * 7], len = big ? 9 : 6;
    ticks += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${(a[0] - n[0] * len).toFixed(1)} ${(a[1] - n[1] * len).toFixed(1)}`;
    if (big) labels.push([p[0] + n[0] * 22, p[1] + n[1] * 22 + 5, k === 0 ? '5' : k === 4 ? '15' : '30']);
  }
  return (
    <svg
      ref={ref}
      viewBox="0 0 360 200"
      style={{ display: 'block', width: '100%', height: 'auto', touchAction: 'none', cursor: 'pointer' }}
      onPointerDown={(e) => {
        const p = fromEvent(e);
        if (Math.abs(p.d - 1) > 0.4) return;
        drag.current = true;
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        set(p.th);
      }}
      onPointerMove={(e) => { if (drag.current) set(fromEvent(e).th); }}
      onPointerUp={() => { drag.current = false; }}
      onPointerCancel={() => { drag.current = false; }}
    >
      <defs>
        <linearGradient id="arcg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FF9A3C" /><stop offset="1" stopColor="#FF5C8E" /></linearGradient>
      </defs>
      <path d={path(0, 1)} fill="none" stroke="#17140F" strokeOpacity={0.07} strokeWidth={8} strokeLinecap="round" />
      {value > 5 && <path d={path(0, tm)} fill="none" stroke="url(#arcg)" strokeOpacity={0.6} strokeWidth={8} strokeLinecap="round" />}
      <path d={ticks} fill="none" stroke="#17140F" strokeOpacity={0.12} strokeWidth={1.5} strokeLinecap="round" />
      {labels.map(([x, y, t]) => <text key={t} x={x} y={y} textAnchor="middle" fontSize={14} fontWeight={600} fill="#17140F" fillOpacity={0.35} fontFamily="Inter Tight, sans-serif">{t}</text>)}
      <circle
        cx={kp[0]} cy={kp[1]} r={12} fill="#17140F" fillOpacity={0.2} stroke="#FFFFFF" strokeOpacity={0.95} strokeWidth={2.5}
        tabIndex={0} role="slider" aria-label="Длительность сессии, минут" aria-valuemin={5} aria-valuemax={30} aria-valuenow={value}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(30, value + 1)); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(5, value - 1)); }
        }}
      />
    </svg>
  );
}
