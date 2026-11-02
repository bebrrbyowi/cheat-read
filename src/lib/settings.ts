import { useSyncExternalStore } from 'react';
import type { Punct } from './rsvp';

export type FontId = 'sans' | 'round' | 'serif';
export type ThemeId = 'light' | 'paper' | 'night';
export type SizeId = 's' | 'm' | 'l';

export interface Settings {
  onboarded: boolean;
  name: string;
  wpm: number;
  font: FontId;
  size: SizeId;
  theme: ThemeId;
  punct: Punct;
  orp: boolean;
  ramp: boolean;
  goal: number;
}

const DEFAULTS: Settings = {
  onboarded: false,
  name: '',
  wpm: 300,
  font: 'serif',
  size: 'm',
  theme: 'light',
  punct: 'soft',
  orp: true,
  ramp: true,
  goal: 20,
};

const KEY = 'cheatread:settings';
let current: Settings = load();
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* приватный режим или запрет хранилища — работаем с настройками по умолчанию */
  }
  return { ...DEFAULTS };
}

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* не страшно: настройки останутся до перезагрузки */
  }
  listeners.forEach((l) => l());
}

export function resetSettings() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  current = { ...DEFAULTS };
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
  );
}

export const FONTS: Record<FontId, { label: string; css: string; k: number }> = {
  sans: { label: 'Inter', css: "'Inter Tight', system-ui, sans-serif", k: 1 },
  round: { label: 'Onest', css: "'Onest', system-ui, sans-serif", k: 1.02 },
  serif: { label: 'Literata', css: "'Literata', Georgia, serif", k: 1 },
};

export const SIZES: Record<SizeId, number> = { s: 36, m: 46, l: 56 };

export interface ReaderTheme {
  bg: string; surface: string; sheet: string; card: string; ink: string; muted: string;
  line: string; chip: string; orp: string; hl: string; btn: string; btnFg: string;
}

export const THEMES: Record<ThemeId, ReaderTheme & { label: string; swatch: string }> = {
  light: { label: 'Светлая', swatch: '#FFFFFF', bg: '#FCFBF8', surface: '#FFFFFF', sheet: '#FCFBF8', card: '#FFFFFF', ink: '#17140F', muted: '#6E675D', line: '#E8E3DB', chip: '#F3EFE9', orp: '#E8590C', hl: '#FCE3BE', btn: '#17140F', btnFg: '#FFFFFF' },
  paper: { label: 'Бумага', swatch: '#EADCC2', bg: '#EFE6D6', surface: '#F8F2E6', sheet: '#EFE6D6', card: '#F8F2E6', ink: '#2B2219', muted: '#6E6152', line: '#DCCFB8', chip: '#E5D9C3', orp: '#C2410C', hl: '#F3CFA0', btn: '#2B2219', btnFg: '#F8F2E6' },
  night: { label: 'Ночь', swatch: '#1C1A18', bg: '#0F0E0D', surface: '#1C1A18', sheet: '#171513', card: '#211F1C', ink: '#EEEAE2', muted: '#9C978E', line: '#2E2B27', chip: '#2C2926', orp: '#FF9A3C', hl: 'rgba(255,154,60,0.30)', btn: '#EEEAE2', btnFg: '#0F0E0D' },
};
