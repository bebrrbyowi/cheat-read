// Работа с текстом: абзацы, слова, предложения, главы.
import { isSentenceEnd } from './rsvp';

export interface Chapter {
  title: string;
  /** Абзацы, разделённые пустой строкой. */
  text: string;
}

export interface Token {
  w: string;
  /** Номер абзаца внутри главы. */
  p: number;
  /** Номер предложения внутри главы. */
  s: number;
}

export function normalizeParagraphs(raw: string): string[] {
  const text = raw.replace(/\r\n?/g, '\n').replace(/ /g, ' ').replace(/[\t\f\v]+/g, ' ');
  let paras = text.split(/\n[ ]*\n+/);
  // В TXT-файлах часто нет пустых строк: тогда абзацем считаем каждую строку.
  if (paras.length < 3 && (text.match(/\n/g) || []).length > 5) {
    const lines = text.split('\n');
    const avg = lines.reduce((a, l) => a + l.trim().length, 0) / Math.max(1, lines.length);
    // Если строки короткие и ровные — это переносы внутри абзаца, склеиваем их.
    if (avg > 50 && avg < 90) {
      paras = [];
      let cur = '';
      for (const l of lines) {
        const t = l.trim();
        if (!t) { if (cur) paras.push(cur); cur = ''; continue; }
        if (/^\s{2,}|^[—–-]\s/.test(l) && cur) { paras.push(cur); cur = t; continue; }
        cur = cur ? cur + ' ' + t : t;
      }
      if (cur) paras.push(cur);
    } else {
      paras = lines;
    }
  }
  return paras.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function tokenize(chapterText: string): Token[] {
  const out: Token[] = [];
  let s = 0;
  chapterText.split('\n\n').forEach((para, p) => {
    for (const w of para.split(' ')) {
      if (!w) continue;
      out.push({ w, p, s });
      if (isSentenceEnd(w)) s += 1;
    }
    // Абзац всегда закрывает предложение (например, заголовок без точки).
    if (out.length && out[out.length - 1].s === s) s += 1;
  });
  return out;
}

export function countWords(text: string): number {
  const m = text.match(/\S+/g);
  return m ? m.length : 0;
}

const HEADING = /^(глава|часть|книга|том|раздел|chapter|part|book)\s+([0-9]+|[ivxlcdm]+|[а-яё]+)\b.{0,60}$/i;
const ROMAN_OR_NUM = /^([ivxlcdm]{1,7}|\d{1,3})\.?$/i;

/** Делит длинный текст на главы по заголовкам, а если их нет — на части примерно по 2500 слов. */
export function splitChapters(paragraphs: string[]): Chapter[] {
  const heads: number[] = [];
  paragraphs.forEach((p, i) => {
    if (p.length <= 70 && (HEADING.test(p) || ROMAN_OR_NUM.test(p))) heads.push(i);
  });
  const chapters: Chapter[] = [];
  if (heads.length >= 2) {
    if (heads[0] > 0) {
      const intro = paragraphs.slice(0, heads[0]);
      if (countWords(intro.join(' ')) > 40) chapters.push({ title: 'Начало', text: intro.join('\n\n') });
    }
    heads.forEach((h, k) => {
      const end = k + 1 < heads.length ? heads[k + 1] : paragraphs.length;
      const body = paragraphs.slice(h + 1, end);
      if (!body.length) return;
      chapters.push({ title: paragraphs[h], text: body.join('\n\n') });
    });
  }
  if (chapters.length >= 2) return chapters;

  const parts: Chapter[] = [];
  let cur: string[] = [];
  let words = 0;
  for (const p of paragraphs) {
    cur.push(p);
    words += countWords(p);
    if (words >= 2500) {
      parts.push({ title: 'Часть ' + (parts.length + 1), text: cur.join('\n\n') });
      cur = [];
      words = 0;
    }
  }
  if (cur.length) {
    if (parts.length && words < 600) parts[parts.length - 1].text += '\n\n' + cur.join('\n\n');
    else parts.push({ title: 'Часть ' + (parts.length + 1), text: cur.join('\n\n') });
  }
  if (parts.length === 1) parts[0].title = 'Текст';
  return parts;
}
