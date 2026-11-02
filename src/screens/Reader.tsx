import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBook, getText, updateBook, addQuote, logReading, uid, type BookMeta, type BookText, type SessionLog } from '../lib/db';
import { tokenize, type Token } from '../lib/text';
import { wordDelay } from '../lib/rsvp';
import { useSettings, setSettings, getSettings, FONTS, SIZES, THEMES, type ThemeId, type FontId, type SizeId } from '../lib/settings';
import { changed } from '../lib/store';
import { Icon, Orb, Sheet, Switch, Range, Word, useToast } from '../components/ui';
import { num, plural } from '../lib/format';

type Mode = 'paused' | 'playing' | 'done' | 'sessionDone';

export default function Reader() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const sessionMin = Number(params.get('session') || 0);
  const nav = useNavigate();
  const st = useSettings();
  const T = THEMES[st.theme];
  const font = FONTS[st.font];

  const [meta, setMeta] = useState<BookMeta | null>(null);
  const [text, setText] = useState<BookText | null>(null);
  const [missing, setMissing] = useState(false);
  const [ch, setCh] = useState(0);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<Mode>('paused');
  const [sheet, setSheet] = useState(false);
  const [toc, setToc] = useState(false);
  const [full, setFull] = useState(false);
  const [quote, setQuote] = useState<{ a: number; b: number; taps: number } | null>(null);
  const [left, setLeft] = useState(sessionMin * 60);
  const [toast, showToast] = useToast();
  const [width, setWidth] = useState(390);
  const rootRef = useRef<HTMLDivElement>(null);

  const playing = mode === 'playing';
  const iRef = useRef(0);
  const chRef = useRef(0);
  const timer = useRef<number>(0);
  const sincePause = useRef(0);
  const playStart = useRef<{ t: number; i: number } | null>(null);
  const session = useRef<SessionLog | null>(null);
  const chapterTime = useRef(0);
  const sessionWords = useRef(0);
  const sessionSecs = useRef(0);

  // загрузка книги
  useEffect(() => {
    (async () => {
      const [m, t] = await Promise.all([getBook(id), getText(id)]);
      if (!m || !t) { setMissing(true); return; }
      const restart = m.finishedAt != null;
      const pos = restart ? { ch: 0, w: 0 } : m.pos;
      setMeta(m); setText(t);
      setCh(pos.ch); chRef.current = pos.ch;
      setI(pos.w); iRef.current = pos.w;
      if (restart) await updateBook(id, { finishedAt: undefined, pos });
      await updateBook(id, { openedAt: Date.now() });
      changed();
    })();
  }, [id]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const tokens: Token[] = useMemo(() => (text ? tokenize(text.chapters[ch]?.text || '') : []), [text, ch]);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const savePos = useCallback((extra: Partial<BookMeta> = {}) => {
    if (!meta) return;
    updateBook(meta.id, { pos: { ch: chRef.current, w: iRef.current }, openedAt: Date.now(), ...extra }).then(changed);
  }, [meta]);

  // учёт времени и слов
  const flush = useCallback(() => {
    const ps = playStart.current;
    if (!ps || !meta) return;
    const secs = Math.round((Date.now() - ps.t) / 1000);
    const words = Math.max(0, iRef.current - ps.i);
    playStart.current = null;
    chapterTime.current += secs;
    sessionWords.current += words;
    sessionSecs.current += secs;
    if (!session.current) session.current = { id: uid(), bookId: meta.id, bookTitle: meta.title, color: meta.color, start: Date.now(), seconds: 0, words: 0 };
    logReading(session.current, secs, words).then(changed);
  }, [meta]);

  const stop = useCallback((next: Mode = 'paused') => {
    clearTimeout(timer.current);
    flush();
    setMode(next);
    savePos();
  }, [flush, savePos]);

  const tick = useCallback(() => {
    const toks = tokensRef.current;
    const cur = toks[iRef.current];
    if (!cur) return;
    const s = getSettings();
    const d = wordDelay(cur.w, { wpm: s.wpm, punct: s.punct, ramp: s.ramp, sincePause: sincePause.current });
    timer.current = window.setTimeout(() => {
      sincePause.current += 1;
      const n = iRef.current + 1;
      if (n >= toks.length) {
        iRef.current = toks.length - 1;
        setI(iRef.current);
        const last = !!text && chRef.current >= text.chapters.length - 1;
        clearTimeout(timer.current);
        flush();
        setMode('done');
        savePos(last ? { finishedAt: Date.now() } : {});
        return;
      }
      iRef.current = n;
      setI(n);
      if (n % 25 === 0) savePos();
      tick();
    }, d);
  }, [flush, savePos, text]);

  const play = useCallback(() => {
    if (!tokensRef.current.length) return;
    if (iRef.current >= tokensRef.current.length - 1) { iRef.current = 0; setI(0); }
    sincePause.current = 0;
    playStart.current = { t: Date.now(), i: iRef.current };
    setMode('playing');
    setFull(false);
    setQuote(null);
    clearTimeout(timer.current);
    tick();
  }, [tick]);

  const toggle = useCallback(() => (playing ? stop() : play()), [playing, play, stop]);

  // таймер быстрой сессии: идёт только во время чтения
  useEffect(() => {
    if (!sessionMin || !playing) return;
    const iv = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) { window.clearInterval(iv); setTimeout(() => stop('sessionDone'), 0); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [sessionMin, playing, stop]);

  // пауза при сворачивании вкладки и сохранение при уходе
  useEffect(() => {
    const vis = () => { if (document.hidden && playStart.current) stop(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [stop]);
  useEffect(() => () => { clearTimeout(timer.current); flush(); savePos(); }, [flush, savePos]);

  // клавиатура (на компьютере)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (sheet || toc || full || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.key === 'ArrowLeft' && !playing) jumpSentence(-1);
      if (e.key === 'ArrowRight' && !playing) jumpSentence(1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const jump = (k: number) => {
    const n = Math.max(0, Math.min(tokens.length - 1, k));
    iRef.current = n; setI(n);
  };
  const sentenceStart = (s: number) => tokens.findIndex((t) => t.s === s);
  const jumpSentence = (dir: number) => {
    const s = tokens[iRef.current]?.s ?? 0;
    if (dir < 0) {
      const st0 = sentenceStart(s);
      jump(iRef.current - st0 < 2 && s > 0 ? sentenceStart(s - 1) : st0);
    } else {
      const n = sentenceStart(s + 1);
      jump(n < 0 ? tokens.length - 1 : n);
    }
    savePos();
  };
  const goChapter = (n: number) => {
    if (!text) return;
    const c = Math.max(0, Math.min(text.chapters.length - 1, n));
    chRef.current = c; setCh(c);
    iRef.current = 0; setI(0);
    chapterTime.current = 0;
    setMode('paused');
    setToc(false);
    savePos();
  };

  if (missing) {
    return (
      <div className="fill empty" style={{ justifyContent: 'center' }}>
        <Orb size={180} mood="sad" tone="muted" />
        <div className="h2">Книга не найдена</div>
        <p className="small" style={{ marginTop: 8 }}>Возможно, её удалили из библиотеки.</p>
        <button className="btn btn-dark" style={{ marginTop: 24 }} onClick={() => nav('/library')}>В библиотеку</button>
      </div>
    );
  }
  if (!meta || !text) return <div className="fill" style={{ background: T.bg }} />;

  const chapters = text.chapters;
  const cur = tokens[i];
  const before = meta.chapterWords.slice(0, ch).reduce((a, c) => a + c, 0);
  const bookFrac = Math.min(1, (before + i) / Math.max(1, meta.totalWords));
  const bookPct = Math.floor(bookFrac * 100);
  const chRemainMin = Math.max(0, Math.ceil((tokens.length - i) / st.wpm));
  const sideL = width * 0.38 - 24, sideR = width * 0.62 - 24;
  const base = SIZES[st.size];
  const orpColor = st.orp ? T.orp : T.ink;
  const tickColor = st.orp ? T.orp : T.muted;

  // предложение вокруг текущего слова
  const sIdx = cur?.s ?? 0;
  const ctx: [number, Token][] = [];
  tokens.forEach((t, k) => { if (t.s === sIdx) ctx.push([k, t]); });
  const sentBounds = (k: number) => {
    const s = tokens[k]?.s;
    let a = k, b = k;
    while (a > 0 && tokens[a - 1].s === s) a--;
    while (b < tokens.length - 1 && tokens[b + 1].s === s) b++;
    return [a, b];
  };
  const quoteText = quote ? tokens.slice(quote.a, quote.b + 1).map((t) => t.w).join(' ').replace(/^[«"„(—–\s]+/, '').replace(/[»")\s,;:—–]+$/, '') : '';
  const quoteWords = quote ? quote.b - quote.a + 1 : 0;

  const header = (
    <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(var(--safe-top) + 12px)', display: 'flex', alignItems: 'center', gap: 10, transition: 'opacity .4s ease', opacity: playing ? 0.28 : 1, zIndex: 2 }}>
      <button className="icon-btn" style={{ background: T.surface, color: T.ink, boxShadow: 'none' }} aria-label="Выйти из режима чтения" onClick={() => { stop(); if ((window.history.state?.idx ?? 0) > 0) nav(-1); else nav('/'); }}>{Icon.back()}</button>
      <button style={{ flex: 1, minWidth: 0, textAlign: 'center', color: T.ink }} onClick={() => { if (!playing) setToc(true); }} aria-label="Оглавление">
        <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.title}</div>
        <div style={{ fontSize: 13, marginTop: 1, color: T.muted }}>глава {ch + 1} из {chapters.length}, {bookPct}% книги</div>
      </button>
      <button className="icon-btn" style={{ background: T.surface, color: T.ink, boxShadow: 'none' }} aria-label="Настройки чтения" onClick={() => { stop(); setSheet(true); }}>{Icon.sliders()}</button>
    </div>
  );

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, background: T.bg, color: T.ink, transition: 'background .35s ease', overflow: 'hidden' }}>
      {header}

      {sessionMin > 0 && mode !== 'sessionDone' && (
        <div className="num" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(var(--safe-top) + 72px)', textAlign: 'center', fontSize: 15, fontWeight: 500, color: T.muted, opacity: playing ? 0.45 : 1, transition: 'opacity .4s ease' }}>
          осталось {left >= 60 ? Math.ceil(left / 60) + ' мин' : 'меньше минуты'}
        </div>
      )}

      {(mode === 'paused' || mode === 'playing') && cur && (
        <button
          onClick={toggle}
          aria-label={playing ? 'Пауза' : 'Читать'}
          style={{ position: 'absolute', left: 0, right: 0, height: 150, transition: 'top .45s ease', top: playing ? 'calc(50% - 75px)' : 'calc(var(--safe-top) + 112px)', color: T.ink }}
        >
          <span aria-hidden="true" style={{ position: 'absolute', left: 28, right: 28, top: 8, height: 1, background: T.line }} />
          <span aria-hidden="true" className="tick" style={{ top: 8, height: 16, background: tickColor }} />
          <span aria-hidden="true" style={{ position: 'absolute', left: 28, right: 28, bottom: 8, height: 1, background: T.line }} />
          <span aria-hidden="true" className="tick" style={{ bottom: 8, height: 16, background: tickColor }} />
          <Word word={cur.w} base={base} left={sideL} right={sideR} fontCss={font.css} k={font.k} color={orpColor} />
        </button>
      )}

      {mode === 'paused' && cur && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(var(--safe-top) + 280px)', bottom: 0, display: 'flex', flexDirection: 'column', padding: '0 16px calc(var(--safe-bottom) + 20px)' }}>
          <div style={{ borderRadius: 28, padding: '14px 18px 16px', background: T.surface, flex: '0 1 auto', minHeight: 70, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: T.muted }}>
              <span>пауза</span>
              <button aria-label="Развернуть текст" onClick={() => setFull(true)} style={{ width: 36, height: 36, margin: '-8px -8px -8px 0', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.chip, color: T.ink }}>{Icon.expand()}</button>
            </div>
            <div style={{ marginTop: 8, fontFamily: font.css, fontSize: 17, lineHeight: '27px', maxHeight: 135, overflow: 'hidden' }}>
              {ctx.map(([k, t]) => (
                <span key={k} onClick={() => jump(k)} style={{ cursor: 'pointer', padding: '1px 2px', borderRadius: 4, background: k === i ? T.hl : 'transparent' }}>{t.w} </span>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 12 }} />
          <div style={{ padding: '0 8px' }}>
            <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: T.line }}><div style={{ height: '100%', width: bookFrac * 100 + '%', background: T.ink }} /></div>
            <div className="num" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.muted }}>
              <span>{bookPct}% книги</span><span>до конца главы ≈ {chRemainMin < 1 ? '1' : chRemainMin} мин</span>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28 }}>
            <button aria-label="Предыдущее предложение" onClick={() => jumpSentence(-1)} style={{ width: 52, height: 52, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surface, color: T.ink }}>{Icon.prev()}</button>
            <button aria-label="Читать" onClick={play} style={{ width: 76, height: 76, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.btn, color: T.btnFg }}>{Icon.play(28)}</button>
            <button aria-label="Следующее предложение" onClick={() => jumpSentence(1)} style={{ width: 52, height: 52, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surface, color: T.ink }}>{Icon.next()}</button>
          </div>
          <div style={{ marginTop: 18, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', padding: '0 6px', background: T.surface }}>
            <button aria-label="Медленнее" onClick={() => setSettings({ wpm: Math.max(150, st.wpm - 20) })} style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.chip, color: T.ink }}>{Icon.minus()}</button>
            <div style={{ flex: 1, textAlign: 'center' }}><span className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>{st.wpm}</span><span style={{ fontSize: 14, color: T.muted }}> сл/мин</span></div>
            <button aria-label="Быстрее" onClick={() => setSettings({ wpm: Math.min(800, st.wpm + 20) })} style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.chip, color: T.ink }}>{Icon.plus(18)}</button>
          </div>
        </div>
      )}

      {playing && (
        <>
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 'calc(var(--safe-bottom) + 124px)', opacity: 0.6 }}>
            <div style={{ height: 2, borderRadius: 1, overflow: 'hidden', background: T.line }}><div style={{ height: '100%', width: bookFrac * 100 + '%', background: T.ink }} /></div>
          </div>
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 'calc(var(--safe-bottom) + 36px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="num" style={{ width: 100, fontSize: 14, color: T.muted }}>{st.wpm} сл/мин</span>
            <button aria-label="Пауза" onClick={() => stop()} style={{ width: 64, height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.btn, color: T.btnFg }}>{Icon.pause()}</button>
            <span style={{ width: 100 }} />
          </div>
        </>
      )}

      {mode === 'done' && (
        <div style={{ position: 'absolute', left: 24, right: 24, top: 'calc(var(--safe-top) + 80px)', bottom: 'calc(var(--safe-bottom) + 24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ flex: 1 }} />
          <Orb size={200} mood="happy" />
          <div style={{ fontSize: 14, color: T.muted }}>глава {ch + 1} из {chapters.length}</div>
          <h2 className="h1" style={{ marginTop: 6, fontSize: 32 }}>{ch >= chapters.length - 1 ? 'Книга прочитана' : 'Глава прочитана'}</h2>
          <div style={{ marginTop: 20, alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderRadius: 24, padding: '14px 0', background: T.surface }}>
            <div><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{num(tokens.length)}</div><div style={{ fontSize: 12, marginTop: 2, color: T.muted }}>слов</div></div>
            <div><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{Math.floor(chapterTime.current / 60)}:{String(chapterTime.current % 60).padStart(2, '0')}</div><div style={{ fontSize: 12, marginTop: 2, color: T.muted }}>минуты</div></div>
            <div><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{st.wpm}</div><div style={{ fontSize: 12, marginTop: 2, color: T.muted }}>сл/мин</div></div>
          </div>
          <div style={{ flex: 1 }} />
          {ch < chapters.length - 1 ? (
            <button className="btn" style={{ background: T.btn, color: T.btnFg }} onClick={() => goChapter(ch + 1)}>Читать главу {ch + 2}</button>
          ) : null}
          <button className="btn-text" style={{ marginTop: 8, color: T.ink }} onClick={() => nav('/library')}>Вернуться в библиотеку</button>
        </div>
      )}

      {mode === 'sessionDone' && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', color: 'var(--ink)', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px calc(var(--safe-bottom) + 24px)' }}>
          <div style={{ flex: 1 }} />
          <Orb size={210} mood="happy" />
          <div className="small">быстрая сессия, {meta.title}</div>
          <h2 className="h1" style={{ marginTop: 6, fontSize: 32 }}>Сессия завершена</h2>
          <div style={{ marginTop: 20, alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderRadius: 24, padding: '14px 0', background: '#fff' }}>
            <div><div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{Math.max(1, Math.round(sessionSecs.current / 60))}</div><div className="meta" style={{ marginTop: 2, fontSize: 12 }}>минут</div></div>
            <div><div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{num(sessionWords.current)}</div><div className="meta" style={{ marginTop: 2, fontSize: 12 }}>слов</div></div>
            <div><div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{st.wpm}</div><div className="meta" style={{ marginTop: 2, fontSize: 12 }}>сл/мин</div></div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-dark" onClick={() => { setLeft(5 * 60); play(); }}>Ещё 5 минут</button>
          <button className="btn-text" style={{ marginTop: 8 }} onClick={() => nav('/')}>На главную</button>
        </div>
      )}

      {full && (
        <FullText
          tokens={tokens} current={i} theme={T} fontCss={font.css} title={meta.title} chapterLabel={`глава ${ch + 1} из ${chapters.length}`}
          quote={quote} quoteText={quoteText} quoteWords={quoteWords}
          onClose={() => { setFull(false); setQuote(null); }}
          onWord={(k) => {
            if (!quote) { jump(k); return; }
            if (quote.taps % 2 === 0) setQuote({ a: k, b: k, taps: quote.taps + 1 });
            else setQuote({ a: Math.min(quote.a, k), b: Math.max(quote.a, k), taps: quote.taps + 1 });
          }}
          onStartQuote={() => { const [a, b] = sentBounds(i); setQuote({ a, b, taps: 0 }); }}
          onCancelQuote={() => setQuote(null)}
          onSaveQuote={async () => {
            await addQuote({ id: uid(), bookId: meta.id, bookTitle: meta.title, author: meta.author, text: quoteText, ch, createdAt: Date.now() });
            changed();
            setQuote(null);
            showToast('Цитата сохранена');
          }}
          onReadHere={() => { setFull(false); savePos(); play(); }}
        />
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} label="Настройки чтения" style={{ background: T.sheet, color: T.ink }}>
        <ReaderSettings word={cur?.w || meta.title.split(' ')[0]} width={width} />
      </Sheet>

      <Sheet open={toc} onClose={() => setToc(false)} label="Оглавление" style={{ background: T.sheet, color: T.ink }}>
        <h2 className="h2" style={{ padding: '10px 6px 8px' }}>Оглавление</h2>
        <div>
          {chapters.map((c, k) => (
            <button key={k} onClick={() => goChapter(k)} style={{ width: '100%', textAlign: 'left', padding: '13px 6px', display: 'flex', gap: 12, alignItems: 'baseline', borderBottom: `1px solid ${T.line}`, color: T.ink }}>
              <span className="num" style={{ width: 26, flex: 'none', fontSize: 13, color: T.muted }}>{k + 1}</span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: k === ch ? 700 : 500 }}>{c.title}</span>
              <span className="num" style={{ fontSize: 13, color: T.muted }}>{Math.max(1, Math.round(meta.chapterWords[k] / st.wpm))} мин</span>
            </button>
          ))}
        </div>
      </Sheet>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function FullText(props: {
  tokens: Token[]; current: number; theme: (typeof THEMES)[ThemeId]; fontCss: string; title: string; chapterLabel: string;
  quote: { a: number; b: number; taps: number } | null; quoteText: string; quoteWords: number;
  onClose: () => void; onWord: (k: number) => void; onStartQuote: () => void; onCancelQuote: () => void; onSaveQuote: () => void; onReadHere: () => void;
}) {
  const { tokens, current, theme: T, quote } = props;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector('[data-cur="1"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'center' });
  }, []);
  const paras: [number, Token][][] = [];
  tokens.forEach((t, k) => { (paras[t.p] ||= []).push([k, t]); });
  return (
    <div role="dialog" aria-label="Полный текст главы" style={{ position: 'absolute', inset: 0, zIndex: 10, background: T.bg, color: T.ink }}>
      <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(var(--safe-top) + 12px)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="icon-btn" aria-label="Свернуть текст" onClick={props.onClose} style={{ background: T.surface, color: T.ink, boxShadow: 'none' }}>{Icon.down()}</button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', marginRight: 54 }}>
          <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{props.title}</div>
          <div style={{ marginTop: 1, fontSize: 13, color: T.muted }}>{props.chapterLabel}</div>
        </div>
      </div>
      {quote && (
        <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(var(--safe-top) + 68px)', height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, background: T.chip }}>
          {quote.taps % 2 === 1 ? 'Теперь на последнее' : 'Нажми на первое слово цитаты'}
        </div>
      )}
      <div
        ref={scroller}
        onClick={(e) => { const k = (e.target as HTMLElement).dataset.k; if (k) props.onWord(Number(k)); }}
        style={{ position: 'absolute', left: 0, right: 0, overflowY: 'auto', padding: '8px 24px 24px', top: quote ? 'calc(var(--safe-top) + 120px)' : 'calc(var(--safe-top) + 68px)', bottom: quote ? 'calc(var(--safe-bottom) + 230px)' : 'calc(var(--safe-bottom) + 100px)' }}
      >
        {paras.map((p, pi) => (
          <p key={pi} style={{ margin: '0 0 18px', fontFamily: props.fontCss, fontSize: 18, lineHeight: '30px' }}>
            {p.map(([k, t]) => {
              const on = quote ? k >= quote.a && k <= quote.b : k === current;
              return <span key={k} data-k={k} data-cur={k === current ? '1' : undefined} style={{ cursor: 'pointer', padding: '2px 1px', borderRadius: 4, background: on ? T.hl : 'transparent' }}>{t.w} </span>;
            })}
          </p>
        ))}
      </div>
      {!quote ? (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(var(--safe-bottom) + 24px)', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 8 }}>
          <button className="btn" style={{ background: T.chip, color: T.ink }} onClick={props.onStartQuote}>{Icon.quote()}Цитата</button>
          <button className="btn" style={{ background: T.btn, color: T.btnFg }} onClick={props.onReadHere}>{Icon.play(15)}Читать отсюда</button>
        </div>
      ) : (
        <div role="group" aria-label="Сохранить цитату" style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(var(--safe-bottom) + 20px)', borderRadius: 28, padding: 18, background: T.surface, boxShadow: '0 -12px 40px -24px rgba(23,20,15,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Новая цитата</span>
            <span className="num" style={{ fontSize: 13, color: T.muted }}>{props.quoteWords} {plural(props.quoteWords, 'слово', 'слова', 'слов')}</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
            <span aria-hidden="true" style={{ flex: 'none', width: 3, borderRadius: 2, background: 'linear-gradient(180deg, #FF8A3D, #FF5C8E)' }} />
            <blockquote style={{ margin: 0, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, lineHeight: '24px', maxHeight: 72, overflow: 'hidden' }}>«{props.quoteText}»</blockquote>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 8 }}>
            <button className="btn" style={{ height: 52, background: T.chip, color: T.ink }} onClick={props.onCancelQuote}>Отмена</button>
            <button className="btn" style={{ height: 52, background: T.btn, color: T.btnFg }} onClick={props.onSaveQuote}>Сохранить цитату</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReaderSettings({ word, width }: { word: string; width: number }) {
  const st = useSettings();
  const T = THEMES[st.theme];
  const font = FONTS[st.font];
  const card: React.CSSProperties = { borderRadius: 22, padding: 12, background: T.card };
  const sel = (on: boolean): React.CSSProperties => ({ background: on ? T.btn : T.chip, color: on ? T.btnFg : T.ink });
  return (
    <div>
      <h2 className="h2" style={{ padding: '10px 6px 0' }}>Настройки чтения</h2>
      <div style={{ marginTop: 14, borderRadius: 24, height: 92, position: 'relative', overflow: 'hidden', background: T.bg }}>
        <span className="tick" style={{ top: 10, height: 12, background: st.orp ? T.orp : T.muted }} />
        <span className="tick" style={{ bottom: 10, height: 12, background: st.orp ? T.orp : T.muted }} />
        <Word word={word} base={Math.round(SIZES[st.size] * 0.78)} left={(width - 32) * 0.38 - 16} right={(width - 32) * 0.62 - 16} fontCss={font.css} k={font.k} color={st.orp ? T.orp : T.ink} />
      </div>
      <div style={{ marginTop: 16, padding: '0 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Скорость</span>
        <span className="num" style={{ fontSize: 15 }}><b>{st.wpm}</b> <span style={{ color: T.muted }}>сл/мин</span></span>
      </div>
      <div style={{ margin: '10px 6px 0' }}><Range min={150} max={800} step={10} value={st.wpm} onChange={(v) => setSettings({ wpm: v })} label="Скорость, слов в минуту" /></div>
      <div className="num" style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', padding: '0 6px', fontSize: 12, color: T.muted }}><span>150</span><span>800</span></div>

      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ fontSize: 13, color: T.muted }}>шрифт слова</div>
        <div role="radiogroup" aria-label="Шрифт слова" style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {(Object.keys(FONTS) as FontId[]).map((f) => (
            <button key={f} role="radio" aria-checked={st.font === f} onClick={() => setSettings({ font: f })} style={{ height: 58, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, ...sel(st.font === f) }}>
              <span style={{ fontSize: 20, lineHeight: 1.1, fontWeight: 500, fontFamily: FONTS[f].css }}>Аа</span>
              <span style={{ fontSize: 11, opacity: 0.75 }}>{FONTS[f].label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={card}>
          <div style={{ fontSize: 13, color: T.muted }}>тема</div>
          <div role="radiogroup" aria-label="Тема" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            {(Object.keys(THEMES) as ThemeId[]).map((t) => (
              <button key={t} role="radio" aria-checked={st.theme === t} aria-label={THEMES[t].label} onClick={() => setSettings({ theme: t })} style={{ width: 40, height: 40, borderRadius: 20, background: THEMES[t].swatch, border: `2px solid ${st.theme === t ? T.ink : T.line}`, boxShadow: st.theme === t ? `inset 0 0 0 3px ${T.card}` : 'none' }} />
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, color: T.muted }}>размер слова</div>
          <div role="radiogroup" aria-label="Размер слова" style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            {(['s', 'm', 'l'] as SizeId[]).map((s, k) => (
              <button key={s} role="radio" aria-checked={st.size === s} aria-label={['Маленький', 'Средний', 'Крупный'][k]} onClick={() => setSettings({ size: s })} style={{ flex: 1, height: 40, borderRadius: 14, fontFamily: 'var(--serif)', fontWeight: 500, fontSize: [14, 18, 22][k], ...sel(st.size === s) }}>Aa</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 10, padding: '4px 14px' }}>
        <div style={{ padding: '10px 0 12px', borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Паузы на знаках препинания</div>
          <div role="radiogroup" aria-label="Паузы на знаках препинания" style={{ marginTop: 10, display: 'flex', gap: 6, borderRadius: 14, padding: 3, background: T.chip }}>
            {([['off', 'Нет'], ['soft', 'Короткие'], ['strong', 'Длинные']] as const).map(([v, l]) => (
              <button key={v} role="radio" aria-checked={st.punct === v} onClick={() => setSettings({ punct: v })} style={{ flex: 1, height: 34, borderRadius: 11, fontSize: 14, fontWeight: 600, background: st.punct === v ? T.card : 'transparent', color: T.ink }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.line}` }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>Точка фокуса</div><div style={{ fontSize: 13, marginTop: 2, color: T.muted }}>Выделять букву, на которую смотреть</div></div>
          <Switch on={st.orp} onChange={(v) => setSettings({ orp: v })} label="Точка фокуса" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>Плавный разгон</div><div style={{ fontSize: 13, marginTop: 2, color: T.muted }}>После паузы первые слова идут медленнее</div></div>
          <Switch on={st.ramp} onChange={(v) => setSettings({ ramp: v })} label="Плавный разгон" />
        </div>
      </div>
    </div>
  );
}
