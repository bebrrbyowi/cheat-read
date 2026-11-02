// Импорт книг: TXT (UTF-8 / UTF-16 / Windows-1251), EPUB, FB2 (в т.ч. .fb2.zip) и вставленный текст.
import JSZip from 'jszip';
import { normalizeParagraphs, splitChapters, countWords, type Chapter } from './text';

export interface ParsedBook {
  title: string;
  author: string;
  format: 'TXT' | 'EPUB' | 'FB2' | 'Текст';
  chapters: Chapter[];
}

export class ImportError extends Error {
  hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

const UNSUPPORTED: Record<string, string> = {
  pdf: 'PDF', doc: 'DOC', docx: 'DOCX', mobi: 'MOBI', azw: 'AZW', azw3: 'AZW3', djvu: 'DjVu', rtf: 'RTF',
};

function baseName(name: string) {
  return name.replace(/\.(fb2\.zip|txt|epub|fb2|zip)$/i, '').replace(/[_]+/g, ' ').trim() || 'Без названия';
}

/** Определяет кодировку TXT. Русские файлы часто сохранены в Windows-1251. */
export function decodeText(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1251').decode(buf);
  }
}

function decodeXml(buf: ArrayBuffer): string {
  const head = new TextDecoder('ascii').decode(new Uint8Array(buf).slice(0, 200));
  const m = head.match(/encoding=["']([\w-]+)["']/i);
  const enc = m ? m[1].toLowerCase() : 'utf-8';
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return decodeText(buf);
  }
}

function parseTxt(text: string, fileName: string): ParsedBook {
  const paras = normalizeParagraphs(text);
  if (countWords(paras.join(' ')) < 3) throw new ImportError('В файле нет текста', 'Проверь, что файл не пустой.');
  return { title: baseName(fileName), author: '', format: 'TXT', chapters: splitChapters(paras) };
}

export function parsePasted(text: string, title: string): ParsedBook {
  const paras = normalizeParagraphs(text);
  if (countWords(paras.join(' ')) < 3) throw new ImportError('Слишком мало текста', 'Вставь хотя бы пару предложений.');
  const t = title.trim() || (paras[0].split(' ').slice(0, 5).join(' ') + (paras[0].split(' ').length > 5 ? '…' : ''));
  return { title: t, author: '', format: 'Текст', chapters: splitChapters(paras) };
}

const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, dd, dt';

function htmlToParagraphs(doc: Document): string[] {
  const body = doc.body || doc.documentElement;
  body.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  body.querySelectorAll('script, style, nav').forEach((n) => n.remove());
  const blocks = Array.from(body.querySelectorAll(BLOCKS)).filter((el) => !el.querySelector(BLOCKS));
  const texts = blocks.length ? blocks.map((b) => b.textContent || '') : [body.textContent || ''];
  return texts.flatMap((t) => t.split('\n')).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

async function parseEpub(buf: ArrayBuffer, fileName: string): Promise<ParsedBook> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new ImportError('Файл повреждён', 'Попробуй скачать книгу заново.');
  }
  const enc = zip.file('META-INF/encryption.xml');
  if (enc) {
    const x = await enc.async('string');
    if (/EncryptedData/i.test(x) && !/fonts?\//i.test(x)) {
      throw new ImportError('Книга защищена от копирования', 'Такие книги открыть не получится. Попробуй найти версию без защиты.');
    }
  }
  const container = await zip.file('META-INF/container.xml')?.async('string');
  const opfPath = container?.match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath || !zip.file(opfPath)) throw new ImportError('Не похоже на EPUB', 'Попробуй другой файл.');
  const opf = new DOMParser().parseFromString(await zip.file(opfPath)!.async('string'), 'application/xml');
  const dir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const meta = (tag: string) => opf.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() || '';
  const manifest = new Map<string, string>();
  Array.from(opf.getElementsByTagNameNS('*', 'item')).forEach((it) => manifest.set(it.getAttribute('id') || '', it.getAttribute('href') || ''));
  const spine = Array.from(opf.getElementsByTagNameNS('*', 'itemref')).map((r) => manifest.get(r.getAttribute('idref') || '')).filter(Boolean) as string[];

  const chapters: Chapter[] = [];
  for (const href of spine) {
    const path = decodeURIComponent(dir + href.split('#')[0]);
    const f = zip.file(path);
    if (!f) continue;
    const src = await f.async('string');
    let doc = new DOMParser().parseFromString(src, 'application/xhtml+xml');
    if (doc.getElementsByTagName('parsererror').length) doc = new DOMParser().parseFromString(src, 'text/html');
    const heading = doc.querySelector('h1, h2, h3')?.textContent?.replace(/\s+/g, ' ').trim();
    const paras = htmlToParagraphs(doc);
    const words = countWords(paras.join(' '));
    if (words < 15) continue;
    let body = paras;
    if (heading && paras[0] === heading) body = paras.slice(1);
    chapters.push({ title: heading && heading.length < 80 ? heading : 'Глава ' + (chapters.length + 1), text: body.join('\n\n') });
  }
  if (!chapters.length) throw new ImportError('В книге не нашлось текста', 'Возможно, она состоит только из картинок.');
  return { title: meta('title') || baseName(fileName), author: meta('creator'), format: 'EPUB', chapters };
}

function parseFb2(xml: string, fileName: string): ParsedBook {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new ImportError('Файл повреждён', 'Попробуй скачать книгу заново.');
  const ti = doc.getElementsByTagNameNS('*', 'title-info')[0];
  const get = (el: Element | undefined, tag: string) => el?.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() || '';
  const authorEl = ti?.getElementsByTagNameNS('*', 'author')[0];
  const author = [get(authorEl, 'first-name'), get(authorEl, 'last-name')].filter(Boolean).join(' ');
  const body = Array.from(doc.getElementsByTagNameNS('*', 'body')).find((b) => !b.getAttribute('name')) || doc.getElementsByTagNameNS('*', 'body')[0];
  if (!body) throw new ImportError('В книге не нашлось текста', 'Попробуй другой файл.');
  const chapters: Chapter[] = [];
  const textOf = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const walk = (sec: Element) => {
    const subs = Array.from(sec.children).filter((c) => c.localName === 'section');
    const title = Array.from(sec.children).find((c) => c.localName === 'title');
    const paras: string[] = [];
    Array.from(sec.children).forEach((c) => {
      if (c.localName === 'section' || c.localName === 'title') return;
      c.querySelectorAll('p, v, subtitle, text-author').forEach((p) => { const t = textOf(p); if (t) paras.push(t); });
      if (c.localName === 'p' || c.localName === 'subtitle') { const t = textOf(c); if (t) paras.push(t); }
    });
    if (countWords(paras.join(' ')) >= 15) {
      const t = title ? textOf(title) : '';
      chapters.push({ title: t && t.length < 80 ? t : 'Глава ' + (chapters.length + 1), text: paras.join('\n\n') });
    }
    subs.forEach(walk);
  };
  const top = Array.from(body.children).filter((c) => c.localName === 'section');
  if (top.length) top.forEach(walk);
  else walk(body);
  if (!chapters.length) throw new ImportError('В книге не нашлось текста', 'Попробуй другой файл.');
  return { title: get(ti, 'book-title') || baseName(fileName), author, format: 'FB2', chapters };
}

export async function parseFile(file: File): Promise<ParsedBook> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';
  if (UNSUPPORTED[ext]) {
    throw new ImportError(UNSUPPORTED[ext] + ' пока не поддерживается', 'Можно сохранить текст в TXT или найти книгу в EPUB или FB2.');
  }
  if (file.size > 60 * 1024 * 1024) throw new ImportError('Файл слишком большой', 'Подойдут файлы до 60 МБ.');
  const buf = await file.arrayBuffer();
  if (ext === 'epub') return parseEpub(buf, file.name);
  if (ext === 'fb2') return parseFb2(decodeXml(buf), file.name);
  if (ext === 'zip') {
    const zip = await JSZip.loadAsync(buf).catch(() => null);
    const inner = zip && Object.values(zip.files).find((f) => /\.fb2$/i.test(f.name));
    if (!inner) throw new ImportError('В архиве нет книги', 'Поддерживаются архивы с FB2 внутри.');
    return parseFb2(decodeXml(await inner.async('arraybuffer')), file.name);
  }
  if (ext === 'txt' || file.type.startsWith('text/')) return parseTxt(decodeText(buf), file.name);
  throw new ImportError('Этот формат не поддерживается', 'Подойдут файлы TXT, EPUB и FB2.');
}

const COVER_COLORS = ['#2E3A2D', '#7A1F23', '#1F2A44', '#C65A2E', '#4A3B6B', '#17140F', '#6B4E2E', '#2F5D62', '#B8433A', '#3B4A3F'];

export function coverColor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_COLORS[h % COVER_COLORS.length];
}
