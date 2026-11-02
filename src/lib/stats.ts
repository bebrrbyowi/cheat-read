import { dayKey, type DayStat, type SessionLog } from './db';

export interface Summary {
  todaySeconds: number;
  streak: number;
  /** Последние 7 дней, начиная с понедельника текущей недели. */
  week: { label: string; seconds: number; isToday: boolean; future: boolean }[];
  /** Последние 4 недели. */
  month: { label: string; seconds: number }[];
  weekSeconds: number;
  prevWeekSeconds: number;
  prevMonthSeconds: number;
  monthSeconds: number;
  weekWords: number;
  monthWords: number;
  avgWpm: number;
  usualLow: number;
  usualHigh: number;
}

const DAY = 86400000;
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function startOfDay(t: number) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function summarize(days: DayStat[], sessions: SessionLog[], now = Date.now()): Summary {
  const map = new Map(days.map((d) => [d.date, d]));
  const today = startOfDay(now);
  const get = (t: number) => map.get(dayKey(t));
  const counts = (t: number) => (get(t)?.seconds || 0) >= 60;

  let streak = 0;
  let t = counts(today) ? today : today - DAY;
  while (counts(t)) { streak += 1; t -= DAY; }

  const wd = (new Date(today).getDay() + 6) % 7;
  const monday = today - wd * DAY;
  const week = WD.map((label, i) => {
    const dt = monday + i * DAY;
    return { label, seconds: get(dt)?.seconds || 0, isToday: dt === today, future: dt > today };
  });
  const sumRange = (from: number, to: number, f: (d: DayStat) => number) => {
    let s = 0;
    for (let x = from; x <= to; x += DAY) { const d = get(x); if (d) s += f(d); }
    return s;
  };
  const month = [3, 2, 1, 0].map((k) => ({
    label: (4 - k) + ' нед',
    seconds: sumRange(monday - k * 7 * DAY, monday - k * 7 * DAY + 6 * DAY, (d) => d.seconds),
  }));

  const rates = sessions.filter((s) => s.seconds >= 30 && s.words > 20).slice(0, 30).map((s) => s.words / (s.seconds / 60)).sort((a, b) => a - b);
  const q = (p: number) => rates.length ? rates[Math.min(rates.length - 1, Math.floor(p * (rates.length - 1)))] : 0;
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

  return {
    todaySeconds: get(today)?.seconds || 0,
    streak,
    week,
    month,
    weekSeconds: sumRange(monday, today, (d) => d.seconds),
    prevWeekSeconds: sumRange(monday - 7 * DAY, monday - DAY, (d) => d.seconds),
    prevMonthSeconds: sumRange(today - 55 * DAY, today - 28 * DAY, (d) => d.seconds),
    monthSeconds: sumRange(today - 27 * DAY, today, (d) => d.seconds),
    weekWords: sumRange(monday, today, (d) => d.words),
    monthWords: sumRange(today - 27 * DAY, today, (d) => d.words),
    avgWpm: Math.round(avg / 10) * 10,
    usualLow: Math.round(q(0.25) / 10) * 10,
    usualHigh: Math.round(q(0.75) / 10) * 10,
  };
}
