import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { orp, fitFontSize } from '../lib/rsvp';

/* ---------- иконки ---------- */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  back: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>,
  close: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>,
  plus: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>,
  minus: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M5 12h14" /></svg>,
  search: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>,
  play: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 4.5v15l12-7.5z" fill="currentColor" /></svg>,
  pause: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" /></svg>,
  arrow: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>,
  chevron: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>,
  down: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>,
  sliders: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h2" /><path d="M10 17h10" /><circle cx="8" cy="17" r="2" /></svg>,
  expand: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M14 4h6v6" /><path d="M20 4l-7 7" /><path d="M10 20H4v-6" /><path d="M4 20l7-7" /></svg>,
  prev: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 5v14" /><path d="M19 6l-9 6 9 6z" /></svg>,
  next: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M20 5v14" /><path d="M5 6l9 6-9 6z" /></svg>,
  quote: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18c2.8-1 4.2-3 4.2-6H5V6h6v6c0 4.4-2.2 7.2-5.6 8.2z" fill="currentColor" /><path d="M14 18c2.8-1 4.2-3 4.2-6H14V6h6v6c0 4.4-2.2 7.2-5.6 8.2z" fill="currentColor" /></svg>,
  check: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={3} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  dots: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="19" cy="12" r="2" fill="currentColor" /></svg>,
  upload: (s = 24) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>,
  clipboard: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={1.9} aria-hidden="true"><rect x="6" y="4" width="12" height="17" rx="2.5" /><path d="M9.5 4V3h5v1" /><path d="M9 11h6" /><path d="M9 15h4" /></svg>,
  book: (s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></svg>,
  share: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>,
  trash: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></svg>,
  list: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M8 6h12" /><path d="M8 12h12" /><path d="M8 18h12" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>,
  home: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={1.9} aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z" /></svg>,
  shelf: (s = 21) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={1.9} aria-hidden="true"><path d="M4.5 4h3.5v16H4.5z" /><path d="M10 4h3.5v16H10z" /><path d="M15.4 5.3l3.2-.9 3.4 15-3.2.9z" /></svg>,
  bars: (s = 21) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M5 20v-8" /><path d="M12 20V5" /><path d="M19 20v-5" /></svg>,
};

/* ---------- маскот ---------- */
export type Mood = 'awake' | 'sleepy' | 'happy' | 'sad';
const TONES = {
  warm: { disk: 'radial-gradient(circle at 34% 26%, rgba(255,214,190,0.75) 0%, rgba(255,214,190,0) 34%), linear-gradient(165deg, #FFB25A 0%, #FF8A4A 48%, #FF6B98 100%)', halo: 'radial-gradient(circle at 50% 52%, rgba(255,128,150,0.42) 0%, rgba(255,150,170,0.30) 42%, rgba(255,190,205,0.12) 58%, rgba(255,220,230,0) 70%)' },
  soft: { disk: 'radial-gradient(circle at 34% 26%, rgba(255,232,220,0.8) 0%, rgba(255,232,220,0) 36%), linear-gradient(165deg, #FFCB95 0%, #FFAE95 50%, #FFA0BF 100%)', halo: 'radial-gradient(circle at 50% 52%, rgba(255,170,185,0.30) 0%, rgba(255,190,205,0.18) 46%, rgba(255,220,230,0) 70%)' },
  muted: { disk: 'radial-gradient(circle at 34% 26%, rgba(250,228,220,0.7) 0%, rgba(250,228,220,0) 34%), linear-gradient(165deg, #E9B79C 0%, #DE9E92 52%, #D58FA6 100%)', halo: 'radial-gradient(circle at 50% 52%, rgba(214,150,160,0.25) 0%, rgba(230,190,198,0.14) 46%, rgba(240,220,226,0) 70%)' },
};

export function Orb({ size = 240, mood = 'awake', tone = 'warm' }: { size?: number; mood?: Mood; tone?: keyof typeof TONES }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (mood !== 'awake') return;
    let t: number, t2: number;
    const loop = () => {
      t = window.setTimeout(() => { setBlink(true); t2 = window.setTimeout(() => setBlink(false), 140); loop(); }, 2600 + Math.random() * 2600);
    };
    loop();
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [mood]);
  const T = TONES[tone];
  const px = (v: number) => v * size + 'px';
  let ew = 0.1, eh = 0.15, tilt = 12, gap = 0.065;
  if (mood === 'sleepy') { ew = 0.11; eh = 0.028; tilt = 0; gap = 0.075; }
  if (mood === 'sad') { ew = 0.085; eh = 0.115; tilt = 0; gap = 0.085; }
  if (mood === 'awake' && blink) eh = 0.022;
  const eye = (right: boolean) => mood === 'happy'
    ? <div style={{ width: px(0.12), height: px(0.12), borderRadius: '50%', boxSizing: 'border-box', border: `${Math.max(2, size * 0.03)}px solid`, borderColor: '#fff transparent transparent transparent' }} />
    : <div style={{ width: px(ew), height: px(eh), borderRadius: '50%', background: '#fff', transition: 'height .14s ease', transform: `translateY(${right && mood === 'awake' ? px(0.016) : 0}) rotate(${mood === 'sad' ? (right ? 12 : -12) : tilt}deg)` }} />;
  return (
    <div role="img" aria-label="Фокус, маскот cheatread" style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: T.halo }} />
      <div style={{ position: 'absolute', left: '15%', top: '16%', width: '70%', height: '68%', borderRadius: '54% 46% 52% 48% / 50% 54% 46% 50%', background: T.disk, filter: `blur(${size * 0.04}px)` }} />
      <div style={{ position: 'absolute', left: '50%', top: '54%', display: 'flex', alignItems: 'center', gap: px(gap), transform: 'translate(-50%, -50%)' }}>
        {eye(false)}{eye(true)}
      </div>
    </div>
  );
}

export function Logo({ width = 112, dark = false }: { width?: number; dark?: boolean }) {
  return <img src={dark ? import.meta.env.BASE_URL + 'logo-dark.svg' : import.meta.env.BASE_URL + 'logo.svg'} alt="cheatread" width={width} height={Math.round(width * 214.6 / 855.83)} style={{ display: 'block' }} />;
}

/* ---------- навигация ---------- */
export function BottomNav() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  return (
    <nav className="nav" aria-label="Навигация">
      <NavLink to="/" end className={cls} aria-label="Главная">{({ isActive }) => <>{Icon.home()}{isActive && 'Главная'}</>}</NavLink>
      <NavLink to="/library" className={cls} aria-label="Библиотека">{({ isActive }) => <>{Icon.shelf()}{isActive && 'Библиотека'}</>}</NavLink>
      <NavLink to="/stats" className={cls} aria-label="Прогресс">{({ isActive }) => <>{Icon.bars()}{isActive && 'Прогресс'}</>}</NavLink>
    </nav>
  );
}

/* ---------- шторка и диалог ---------- */
export function Sheet({ open, onClose, children, label, style }: { open: boolean; onClose: () => void; children: ReactNode; label: string; style?: React.CSSProperties }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={label} style={style}>
        <div className="grab" />
        {children}
      </div>
    </>
  );
}

export function Confirm({ open, title, text, okLabel, onOk, onCancel, danger }: { open: boolean; title: string; text: string; okLabel: string; onOk: () => void; onCancel: () => void; danger?: boolean }) {
  if (!open) return null;
  return (
    <>
      <div className="backdrop" onClick={onCancel} />
      <div className="dialog" role="alertdialog" aria-label={title}>
        <div className="h2" style={{ fontSize: 20 }}>{title}</div>
        <p className="small" style={{ margin: '8px 0 0', fontSize: 15, lineHeight: '22px' }}>{text}</p>
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn btn-soft" style={{ height: 50 }} onClick={onCancel}>Отмена</button>
          <button className="btn" style={{ height: 50, background: danger ? 'var(--danger)' : 'var(--ink)', color: '#fff' }} onClick={onOk}>{okLabel}</button>
        </div>
      </div>
    </>
  );
}

export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<number>(0);
  const show = (m: string) => { clearTimeout(t.current); setMsg(m); t.current = window.setTimeout(() => setMsg(null), 2200); };
  useEffect(() => () => clearTimeout(t.current), []);
  return [msg, show];
}

/* ---------- элементы управления ---------- */
export function Switch({ on, onChange, label, color, off }: { on: boolean; onChange: (v: boolean) => void; label: string; color?: string; off?: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className="switch" style={{ background: on ? color : off }} onClick={() => onChange(!on)}><span /></button>;
}

export function Segmented<T extends string | number>({ value, options, onChange, label, style }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; style?: React.CSSProperties }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={style}>
      {options.map((o) => <button key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export function Range({ min, max, step, value, onChange, label }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void; label: string }) {
  const pct = ((value - min) / (max - min)) * 100 + '%';
  return (
    <div className="range">
      <div className="track" />
      <div className="fillbar" style={{ width: pct }} />
      <div className="thumb" style={{ left: pct }} />
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

/* Размер шрифта названия на обложке: самое длинное слово должно влезать целиком */
export function coverTitleSize(title: string, innerW: number, base: number): number {
  const longest = Math.min(11, Math.max(1, ...title.split(/\s+/).map((w) => w.length)));
  return Math.max(9, Math.min(base, Math.floor(innerW / (longest * 0.6))));
}

export const coverTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)', fontStyle: 'italic', lineHeight: 1.18, overflow: 'hidden',
  display: '-webkit-box', WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere', hyphens: 'auto',
};

export function Cover({ color, w = 38, h = 54, title }: { color: string; w?: number; h?: number; title?: string }) {
  const padX = w * 0.1;
  const size = title ? coverTitleSize(title, w - padX * 2, Math.max(8, w * 0.15)) : 0;
  const lines = title ? Math.max(1, Math.floor((h * 0.84) / (size * 1.18))) : 0;
  return (
    <span aria-hidden="true" className="cover" lang="ru" style={{ width: w, height: h, background: color, display: 'block', color: 'rgba(255,255,255,0.85)', padding: title ? `${h * 0.08}px ${padX}px` : 0 }}>
      {title && <span style={{ ...coverTitleStyle, fontSize: size, WebkitLineClamp: lines }}>{title}</span>}
    </span>
  );
}

/* ---------- RSVP-слово ---------- */
export function Word({ word, base, left, right, fontCss, k = 1, color, gradient }: { word: string; base: number; left: number; right: number; fontCss: string; k?: number; color?: string; gradient?: boolean }) {
  const p = orp(word);
  const size = fitFontSize(p, base, left, right, k);
  return (
    <span className="word" style={{ fontSize: size, fontFamily: fontCss }}>
      <span className="side l">{p.pre}</span>
      {gradient ? <span className="grad">{p.mid}</span> : <span style={{ color }}>{p.mid}</span>}
      <span className="side">{p.post}</span>
    </span>
  );
}
