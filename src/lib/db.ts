// Хранение данных в браузере (IndexedDB). Ничего не уходит на сервер.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Chapter } from './text';

export interface BookMeta {
  id: string;
  title: string;
  author: string;
  format: 'TXT' | 'EPUB' | 'FB2' | 'Текст';
  color: string;
  addedAt: number;
  openedAt: number;
  chapterTitles: string[];
  chapterWords: number[];
  totalWords: number;
  pos: { ch: number; w: number };
  finishedAt?: number;
}

export interface BookText {
  id: string;
  chapters: Chapter[];
}

export interface Quote {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  text: string;
  ch: number;
  createdAt: number;
}

export interface SessionLog {
  id: string;
  bookId: string;
  bookTitle: string;
  color: string;
  start: number;
  seconds: number;
  words: number;
}

export interface DayStat {
  date: string;
  seconds: number;
  words: number;
}

interface Schema extends DBSchema {
  books: { key: string; value: BookMeta };
  texts: { key: string; value: BookText };
  quotes: { key: string; value: Quote; indexes: { byBook: string } };
  sessions: { key: string; value: SessionLog };
  days: { key: string; value: DayStat };
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB<Schema>('cheatread', 1, {
      upgrade(d) {
        d.createObjectStore('books', { keyPath: 'id' });
        d.createObjectStore('texts', { keyPath: 'id' });
        const q = d.createObjectStore('quotes', { keyPath: 'id' });
        q.createIndex('byBook', 'bookId');
        d.createObjectStore('sessions', { keyPath: 'id' });
        d.createObjectStore('days', { keyPath: 'date' });
      },
    });
  }
  return dbp;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function listBooks(): Promise<BookMeta[]> {
  const all = await (await db()).getAll('books');
  return all.sort((a, b) => b.openedAt - a.openedAt);
}
export async function getBook(id: string) { return (await db()).get('books', id); }
export async function getText(id: string) { return (await db()).get('texts', id); }
export async function saveBook(meta: BookMeta, text?: BookText) {
  const d = await db();
  const tx = d.transaction(['books', 'texts'], 'readwrite');
  await tx.objectStore('books').put(meta);
  if (text) await tx.objectStore('texts').put(text);
  await tx.done;
}
export async function updateBook(id: string, patch: Partial<BookMeta>) {
  const d = await db();
  const cur = await d.get('books', id);
  if (!cur) return;
  await d.put('books', { ...cur, ...patch });
}
export async function deleteBook(id: string) {
  const d = await db();
  const tx = d.transaction(['books', 'texts', 'quotes'], 'readwrite');
  await tx.objectStore('books').delete(id);
  await tx.objectStore('texts').delete(id);
  const qs = await tx.objectStore('quotes').index('byBook').getAllKeys(id);
  for (const k of qs) await tx.objectStore('quotes').delete(k);
  await tx.done;
}

export async function listQuotes(): Promise<Quote[]> {
  const all = await (await db()).getAll('quotes');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}
export async function addQuote(q: Quote) { await (await db()).put('quotes', q); }
export async function deleteQuote(id: string) { await (await db()).delete('quotes', id); }

export function dayKey(t = Date.now()): string {
  const d = new Date(t);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Добавляет прочитанное время и слова в статистику дня и в журнал сессии. */
export async function logReading(session: SessionLog, addSeconds: number, addWords: number) {
  if (addSeconds <= 0 && addWords <= 0) return;
  const d = await db();
  const key = dayKey();
  const day = (await d.get('days', key)) || { date: key, seconds: 0, words: 0 };
  day.seconds += addSeconds;
  day.words += addWords;
  await d.put('days', day);
  session.seconds += addSeconds;
  session.words += addWords;
  await d.put('sessions', { ...session });
}

export async function listDays(): Promise<DayStat[]> { return (await db()).getAll('days'); }
export async function listSessions(): Promise<SessionLog[]> {
  const all = await (await db()).getAll('sessions');
  return all.filter((s) => s.seconds >= 5).sort((a, b) => b.start - a.start);
}

export async function wipeAll() {
  const d = await db();
  for (const s of ['books', 'texts', 'quotes', 'sessions', 'days'] as const) await d.clear(s);
}
