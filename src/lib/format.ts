export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 10, b = Math.abs(n) % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few;
  return many;
}

export function num(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function shortNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '') + ' млн';
  if (n >= 10_000) return Math.round(n / 1000) + ' тыс.';
  return num(n);
}

export function minutesLabel(seconds: number): string {
  if (seconds > 0 && seconds < 30) return '<1 мин';
  const m = Math.round(seconds / 60);
  if (m < 60) return m + ' мин';
  const h = Math.floor(m / 60);
  return h + ' ч ' + (m % 60) + ' мин';
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function relDate(t: number): string {
  const d = new Date(t);
  const now = new Date();
  const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t >= startToday) return 'сегодня, ' + time;
  if (t >= startToday - 86400000) return 'вчера, ' + time;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '') + ', ' + time;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
