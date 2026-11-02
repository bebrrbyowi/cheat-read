// Простая подписка на изменения в базе: экраны перечитывают данные, когда что-то поменялось.
import { useEffect, useState } from 'react';
import { listBooks, listQuotes, listDays, listSessions, type BookMeta, type Quote, type DayStat, type SessionLog } from './db';

let version = 0;
const subs = new Set<() => void>();
export function changed() {
  version += 1;
  subs.forEach((s) => s());
}

function useVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    const f = () => setV(version);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return v;
}

function useLoad<T>(fn: () => Promise<T>, initial: T): [T, boolean] {
  const v = useVersion();
  const [data, setData] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    fn().then((d) => { if (alive) { setData(d); setReady(true); } }).catch(() => setReady(true));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return [data, ready];
}

export const useBooks = () => useLoad<BookMeta[]>(listBooks, []);
export const useQuotes = () => useLoad<Quote[]>(listQuotes, []);
export const useStatsData = () => useLoad<{ days: DayStat[]; sessions: SessionLog[] }>(async () => ({ days: await listDays(), sessions: await listSessions() }), { days: [], sessions: [] });

export function bookProgress(b: BookMeta): number {
  if (b.finishedAt) return 1;
  const before = b.chapterWords.slice(0, b.pos.ch).reduce((a, c) => a + c, 0);
  return Math.min(1, (before + b.pos.w) / Math.max(1, b.totalWords));
}
