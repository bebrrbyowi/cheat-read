// Логика RSVP-чтения: точка фокуса (ORP), задержки, подгонка размера длинных слов.
// Не зависит от React — этот файл можно перенести в Expo-приложение почти без изменений.

export type Punct = 'off' | 'soft' | 'strong';

export interface OrpParts {
  pre: string;
  mid: string;
  post: string;
}

const LETTER = /[A-Za-zА-Яа-яЁё0-9]/;

/** Делит слово на часть до буквы фокуса, саму букву и остаток. */
export function orp(word: string): OrpParts {
  const letters = word.replace(/[^A-Za-zА-Яа-яЁё0-9]/g, '').length;
  const shift = letters <= 1 ? 0 : letters <= 5 ? 1 : letters <= 9 ? 2 : letters <= 13 ? 3 : 4;
  let lead = word.search(LETTER);
  if (lead < 0) lead = 0;
  const k = Math.min(Math.max(word.length - 1, 0), lead + shift);
  return { pre: word.slice(0, k), mid: word.charAt(k), post: word.slice(k + 1) };
}

const SENTENCE_END = /[.!?…][»"”)]*$/;
const CLAUSE_END = /[,;:][»"”)]*$/;

export function isSentenceEnd(word: string): boolean {
  return SENTENCE_END.test(word);
}

export interface DelayOptions {
  wpm: number;
  punct: Punct;
  ramp: boolean;
  /** Сколько слов прошло после последней паузы — для плавного разгона. */
  sincePause: number;
}

/** Сколько миллисекунд показывать слово. */
export function wordDelay(word: string, o: DelayOptions): number {
  let d = 60000 / Math.max(60, o.wpm);
  const end = o.punct === 'off' ? 1 : o.punct === 'soft' ? 1.8 : 2.6;
  const mid = o.punct === 'off' ? 1 : o.punct === 'soft' ? 1.3 : 1.6;
  if (SENTENCE_END.test(word)) d *= end;
  else if (CLAUSE_END.test(word) || word === '—' || word === '–') d *= mid;
  const letters = word.replace(/[^A-Za-zА-Яа-яЁё]/g, '').length;
  if (letters > 8) d *= 1 + Math.min(0.4, (letters - 8) * 0.04);
  if (o.ramp && o.sincePause < 8) d *= 1.6 - o.sincePause * 0.075;
  return d;
}

/** Примерная ширина строки в долях кегля (em). */
function widthEm(s: string, k = 1): number {
  let e = 0;
  for (const ch of s) {
    if (/[—–]/.test(ch)) e += 1;
    else if (/[шщжмыюфШЩЖМЫЮФmwMW]/.test(ch)) e += 0.8;
    else if (/[ilj.,:;!'’«»()\-1"]/.test(ch)) e += 0.34;
    else if (/[А-ЯЁA-Z]/.test(ch)) e += 0.7;
    else e += 0.58;
  }
  return e * k;
}

/**
 * Подбирает кегль, чтобы слово целиком влезло по обе стороны от точки фокуса.
 * left / right — свободное место слева и справа от буквы фокуса в пикселях.
 */
export function fitFontSize(p: OrpParts, base: number, left: number, right: number, k = 1): number {
  const half = widthEm(p.mid, k) / 2;
  const l = widthEm(p.pre, k) + half;
  const r = widthEm(p.post, k) + half;
  return Math.max(18, Math.min(base, Math.floor(left / Math.max(l, 0.01)), Math.floor(right / Math.max(r, 0.01))));
}
