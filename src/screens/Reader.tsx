import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBook, getText, updateBook, addQuote, logReading, uid, type BookMeta, type BookText, type SessionLog } from '../lib/db';
import { tokenize, type Token } from '../lib/text';
import { wordDelay, orp, fitFontSize } from '../lib/rsvp';
import { Frame } from '../components/Frame';
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

  // быструю сессию запускаем сразу, как в макете
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!sessionMin || autoStarted.current || !tokens.length) return;
    autoStarted.current = true;
    play();
  }, [sessionMin, tokens, play]);

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
      <Frame>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <Orb size={180} mood="sad" tone="muted" />
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Книга не найдена</div>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: '#706C64' }}>Возможно, её удалили из библиотеки.</p>
          <button onClick={() => nav('/library')} style={{ marginTop: 24, alignSelf: 'stretch', height: 56, borderRadius: 28, background: '#161513', color: '#FFFFFF', fontSize: 16, fontWeight: 600 }}>В библиотеку</button>
        </div>
      </Frame>
    );
  }
  if (!meta || !text) return <Frame bg={T.bg}><span /></Frame>;

  const chapters = text.chapters;
  const cur = tokens[i];
  const before = meta.chapterWords.slice(0, ch).reduce((a, c) => a + c, 0);
  const bookFrac = Math.min(1, (before + i) / Math.max(1, meta.totalWords));
  const bookPct = Math.floor(bookFrac * 100);
  const chRemain = (tokens.length - i) / st.wpm;
  const base = SIZES[st.size];
  const orpColor = st.orp ? T.orp : T.ink;
  const tickColor = st.orp ? T.orp : T.muted;
  const abs = (x: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...x });
  const round = (size: number, bg: string, fg: string): React.CSSProperties => ({ width: size, height: size, borderRadius: size / 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg, flex: 'none' });
  const exit = () => { stop(); if ((window.history.state?.idx ?? 0) > 0) nav(-1); else nav('/'); };
  const isSession = sessionMin > 0;

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

  const toastEl = toast && (
    <div role="status" style={abs({ left: '50%', top: 108, transform: 'translateX(-50%)', height: 44, padding: '0 18px 0 8px', borderRadius: 22, background: '#17140F', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, boxShadow: '0 12px 30px -12px rgba(23,20,15,0.5)', zIndex: 60 })}>
      <span style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(160deg, #FF9A3C, #FF6F9C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.check(14)}</span>
      {toast}
    </div>
  );

  /* ---------- быстрая сессия: макет «2.3 · Сессия» ---------- */
  if (isSession) {
    const total = sessionMin * 60;
    const sPlaying = playing;
    const sPaused = mode === 'paused';
    const o = orp(cur?.w || '');
    return (
      <Frame>
        {mode !== 'sessionDone' && (
          <>
            <div style={abs({ left: 16, right: 16, top: 52, display: 'flex', alignItems: 'center', gap: 10, transition: 'opacity .4s ease', opacity: sPlaying ? 0.35 : 1 })}>
              <button onClick={() => stop('sessionDone')} aria-label="Завершить сессию" style={{ ...round(44, '#FFFFFF', '#17140F'), boxShadow: '0 1px 3px rgba(23,20,15,0.08)' }}>{Icon.close(18)}</button>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'center', marginRight: 54 }}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.title}</div>
                <div style={{ marginTop: 1, fontSize: 13, color: '#6E675D' }}>быстрая сессия, {sessionMin} мин</div>
              </div>
            </div>
            <div className="num" style={abs({ left: 0, right: 0, top: 150, textAlign: 'center', transition: 'opacity .4s ease', opacity: sPlaying ? 0.45 : 1, fontSize: 15, fontWeight: 500, color: '#8A837A' })}>
              осталось {left >= 60 ? Math.ceil(left / 60) + ' мин' : 'меньше минуты'}
            </div>
            <button onClick={toggle} aria-label={sPlaying ? 'Пауза' : 'Продолжить'} style={abs({ left: 20, right: 20, top: 280, height: 210, borderRadius: 32, background: '#FFFFFF', boxShadow: '0 1px 0 rgba(23,20,15,0.03), 0 18px 40px -24px rgba(70,45,10,0.28)', overflow: 'hidden', color: '#17140F' })}>
              <span aria-hidden="true" style={abs({ left: '38%', top: 38, width: 2, height: 20, marginLeft: -1, borderRadius: 1, background: '#FF8A3D' })} />
              <span aria-hidden="true" style={abs({ left: '38%', bottom: 38, width: 2, height: 20, marginLeft: -1, borderRadius: 1, background: '#FF5C8E' })} />
              <span style={abs({ left: '38%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'baseline', fontFamily: "'Literata', Georgia, serif", fontSize: fitFontSize(o, 44, 117, 201, 1), fontWeight: 500, lineHeight: 1.4, whiteSpace: 'nowrap' })}>
                <span style={{ flex: 'none', width: 400, textAlign: 'right' }}>{o.pre}</span>
                <span style={{ flex: 'none', display: 'inline-block', lineHeight: 1.4, padding: '0 0.03em 0.12em', margin: '0 -0.03em -0.12em', background: 'linear-gradient(180deg, #FF8A3D, #FF5C8E)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{o.mid}</span>
                <span style={{ flex: 'none', width: 400, textAlign: 'left' }}>{o.post}</span>
              </span>
            </button>
            <div style={abs({ left: 28, right: 28, top: 516, transition: 'opacity .4s ease', opacity: sPlaying ? 0.45 : 1 })}>
              <div style={{ height: 3, borderRadius: 2, background: '#EFEAE2', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #FF9A3C, #FF5C8E)', transition: 'width 1s linear', width: ((total - left) / total) * 100 + '%' }} />
              </div>
              <div className="num" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6E675D' }}>
                <span>{num(sessionWords.current + (playStart.current ? Math.max(0, i - playStart.current.i) : 0))} слов</span><span>{st.wpm} сл/мин</span>
              </div>
            </div>
            {sPlaying && (
              <div style={abs({ left: 0, right: 0, bottom: 56, display: 'flex', flexDirection: 'column', alignItems: 'center' })}>
                <button onClick={toggle} aria-label="Пауза" style={round(72, '#17140F', '#FFFFFF')}>{Icon.pause()}</button>
                <div style={{ marginTop: 12, fontSize: 13, color: '#6E675D' }}>Нажми на слово, чтобы поставить паузу</div>
              </div>
            )}
            {sPaused && (
              <div style={abs({ left: 20, right: 20, bottom: 36, display: 'flex', flexDirection: 'column', gap: 8 })}>
                <div style={{ textAlign: 'center', fontSize: 14, color: '#6E675D', marginBottom: 6 }}>Пауза. Таймер остановлен</div>
                <button onClick={play} style={{ height: 56, borderRadius: 28, background: '#17140F', color: '#FFFFFF', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>{Icon.play(15)}Продолжить</button>
                <button onClick={() => stop('sessionDone')} style={{ height: 52, borderRadius: 26, background: '#FFFFFF', fontSize: 16, fontWeight: 600 }}>Завершить сессию</button>
              </div>
            )}
          </>
        )}
        {mode === 'sessionDone' && (
          <div style={abs({ inset: 0, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' })}>
            <div style={{ flex: 1 }} />
            <Orb size={210} mood="happy" />
            <div style={{ fontSize: 14, color: '#6E675D' }}>быстрая сессия, {meta.title}</div>
            <h2 style={{ margin: '6px 0 0', fontSize: 32, lineHeight: '35px', fontWeight: 800, letterSpacing: '-0.02em' }}>{left <= 0 ? sessionMin + ' ' + plural(sessionMin, 'минута', 'минуты', 'минут') + ' чтения' : 'Сессия завершена'}</h2>
            <div style={{ marginTop: 20, alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderRadius: 24, padding: '14px 0', background: '#FFFFFF' }}>
              <div><div className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{Math.max(1, Math.round(sessionSecs.current / 60))}</div><div style={{ marginTop: 2, fontSize: 12, color: '#6E675D' }}>минут</div></div>
              <div><div className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{num(sessionWords.current)}</div><div style={{ marginTop: 2, fontSize: 12, color: '#6E675D' }}>слов</div></div>
              <div><div className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{st.wpm}</div><div style={{ marginTop: 2, fontSize: 12, color: '#6E675D' }}>сл/мин</div></div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setLeft(5 * 60); play(); }} style={{ alignSelf: 'stretch', height: 56, borderRadius: 28, background: '#17140F', color: '#FFFFFF', fontSize: 16, fontWeight: 600 }}>Ещё 5 минут</button>
            <button onClick={() => nav('/')} style={{ margin: '8px 0 32px', alignSelf: 'stretch', height: 52, borderRadius: 26, fontSize: 16, fontWeight: 600 }}>На главную</button>
          </div>
        )}
        {toastEl}
      </Frame>
    );
  }

  /* ---------- обычное чтение: макет «4 · Чтение» ---------- */
  return (
    <Frame bg={T.bg} color={T.ink}>
      <div ref={rootRef} style={abs({ inset: 0, background: T.bg, color: T.ink, transition: 'background .35s ease, color .35s ease', overflow: 'hidden' })}>
        <div style={abs({ left: 16, right: 16, top: 52, display: 'flex', alignItems: 'center', gap: 10, transition: 'opacity .4s ease', opacity: playing ? 0.28 : 1, zIndex: 2 })}>
          <button aria-label="Выйти из режима чтения" onClick={exit} style={round(44, T.surface, T.ink)}>{Icon.back()}</button>
          <button onClick={() => { if (!playing) setToc(true); }} aria-label="Оглавление" style={{ flex: 1, minWidth: 0, textAlign: 'center', color: T.ink }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.title}</div>
            <div style={{ fontSize: 13, marginTop: 1, color: T.muted }}>глава {ch + 1} из {chapters.length}, {bookPct}% книги</div>
          </button>
          <button aria-label="Настройки чтения" onClick={() => { stop(); setSheet(true); }} style={round(44, T.surface, T.ink)}>{Icon.sliders()}</button>
        </div>

        {(mode === 'paused' || mode === 'playing') && cur && (
          <button onClick={toggle} aria-label={playing ? 'Пауза' : 'Читать'} style={abs({ left: 0, right: 0, height: 150, transition: 'top .45s ease', top: playing ? 330 : 196, color: T.ink, display: 'flex', alignItems: 'center' })}>
            <span aria-hidden="true" style={abs({ left: 28, right: 28, top: 8, height: 1, background: T.line })} />
            <span aria-hidden="true" style={abs({ left: '38%', top: 8, width: 2, height: 16, marginLeft: -1, borderRadius: 1, background: tickColor })} />
            <span aria-hidden="true" style={abs({ left: 28, right: 28, bottom: 8, height: 1, background: T.line })} />
            <span aria-hidden="true" style={abs({ left: '38%', bottom: 8, width: 2, height: 16, marginLeft: -1, borderRadius: 1, background: tickColor })} />
            <Word word={cur.w} base={base} left={124} right={214} fontCss={font.css} k={font.k} color={orpColor} />
          </button>
        )}

        {mode === 'paused' && cur && (
          <>
            <div style={abs({ left: 16, right: 16, top: 366, borderRadius: 28, padding: '16px 18px 18px', background: T.surface })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 20, fontSize: 13, color: T.muted }}>
                <span>пауза</span>
                <button aria-label="Развернуть текст" onClick={() => setFull(true)} style={{ ...round(36, T.chip, T.ink), margin: '-8px -8px -8px 0' }}>{Icon.expand()}</button>
              </div>
              <div style={{ marginTop: 10, fontFamily: font.css, fontSize: 17, lineHeight: '27px', maxHeight: 135, overflow: 'hidden' }}>
                {ctx.map(([k, t]) => (
                  <button key={k} onClick={() => jump(k)} style={{ display: 'inline', margin: '0 4px 0 0', padding: '1px 2px', borderRadius: 4, font: 'inherit', color: 'inherit', background: k === i ? T.hl : 'transparent' }}>{t.w}</button>
                ))}
              </div>
            </div>
            <div style={abs({ left: 24, right: 24, top: 556 })}>
              <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: T.line }}><div style={{ height: '100%', borderRadius: 2, transition: 'width .2s linear', width: bookFrac * 100 + '%', background: T.ink }} /></div>
              <div className="num" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.muted }}>
                <span>{bookPct}% книги</span><span>{chRemain < 1 ? '< 1 мин' : '≈ ' + Math.ceil(chRemain) + ' мин'}</span>
              </div>
            </div>
            <div style={abs({ left: 0, right: 0, top: 604, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28 })}>
              <button aria-label="Предыдущее предложение" onClick={() => jumpSentence(-1)} style={round(52, T.surface, T.ink)}>{Icon.prev()}</button>
              <button aria-label="Читать" onClick={play} style={round(76, T.btn, T.btnFg)}>{Icon.play(28)}</button>
              <button aria-label="Следующее предложение" onClick={() => jumpSentence(1)} style={round(52, T.surface, T.ink)}>{Icon.next()}</button>
            </div>
            <div style={abs({ left: 16, right: 16, top: 700, display: 'flex', flexDirection: 'column', gap: 10 })}>
              <div style={{ height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', padding: '0 6px', background: T.surface }}>
                <button aria-label="Медленнее" onClick={() => setSettings({ wpm: Math.max(150, st.wpm - 20) })} style={round(44, T.chip, T.ink)}>{Icon.minus()}</button>
                <div style={{ flex: 1, textAlign: 'center' }}><span className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>{st.wpm}</span><span style={{ fontSize: 14, color: T.muted }}> сл/мин</span></div>
                <button aria-label="Быстрее" onClick={() => setSettings({ wpm: Math.min(800, st.wpm + 20) })} style={round(44, T.chip, T.ink)}>{Icon.plus(18)}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {[250, 340, 450, 600].map((v) => (
                  <button key={v} aria-pressed={st.wpm === v} onClick={() => setSettings({ wpm: v })} className="num" style={{ height: 40, borderRadius: 20, fontSize: 14, fontWeight: 600, transition: 'background .2s ease', background: st.wpm === v ? T.btn : T.surface, color: st.wpm === v ? T.btnFg : T.ink }}>{v}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {playing && (
          <>
            <div style={abs({ left: 24, right: 24, bottom: 132, opacity: 0.6 })}>
              <div style={{ height: 2, borderRadius: 1, overflow: 'hidden', background: T.line }}><div style={{ height: '100%', transition: 'width .2s linear', width: bookFrac * 100 + '%', background: T.ink }} /></div>
            </div>
            <div style={abs({ left: 24, right: 24, bottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
              <span className="num" style={{ width: 100, fontSize: 14, color: T.muted }}>{st.wpm} сл/мин</span>
              <button aria-label="Пауза" onClick={() => stop()} style={round(64, T.btn, T.btnFg)}>{Icon.pause()}</button>
              <span style={{ width: 100 }} />
            </div>
          </>
        )}

        {mode === 'done' && (
          <div style={abs({ left: 24, right: 24, top: 108, bottom: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' })}>
            <div style={{ flex: 1 }} />
            <Orb size={210} mood="happy" tone={st.theme === 'night' ? 'muted' : undefined} />
            <div style={{ fontSize: 14, color: T.muted }}>глава {ch + 1} из {chapters.length}</div>
            <h2 style={{ margin: '6px 0 0', fontSize: 32, lineHeight: '35px', fontWeight: 700, letterSpacing: '-0.04em' }}>{ch >= chapters.length - 1 ? 'Книга прочитана' : 'Глава прочитана'}</h2>
            <div style={{ marginTop: 20, alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderRadius: 24, padding: '14px 0', background: T.surface }}>
              <div><div className="num" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>{num(tokens.length)}</div><div style={{ fontSize: 12, marginTop: 2, color: T.muted }}>слов</div></div>
              <div><div className="num" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>{Math.floor(chapterTime.current / 60)}:{String(chapterTime.current % 60).padStart(2, '0')}</div><div style={{ fontSize: 12, marginTop: 2, color: T.muted }}>минуты</div></div>
              <div><div className="num" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>{st.wpm}</div><div style={{ fontSize: 12, marginTop: 2, color: T.muted }}>сл/мин</div></div>
            </div>
            <div style={{ flex: 1 }} />
            {ch < chapters.length - 1 && (
              <button onClick={() => goChapter(ch + 1)} style={{ alignSelf: 'stretch', height: 56, borderRadius: 28, fontSize: 17, fontWeight: 600, background: T.btn, color: T.btnFg }}>Читать главу {ch + 2}</button>
            )}
            <button onClick={() => nav('/library')} style={{ marginTop: 8, alignSelf: 'stretch', height: 48, fontSize: 15, fontWeight: 600, color: T.ink }}>Вернуться в библиотеку</button>
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

        <Sheet open={sheet} onClose={() => setSheet(false)} label="Настройки чтения" style={{ background: T.sheet, color: T.ink, padding: '10px 16px 30px' }}>
          <ReaderSettings word={cur?.w || meta.title.split(' ')[0]} />
        </Sheet>

        <Sheet open={toc} onClose={() => setToc(false)} label="Оглавление" style={{ background: T.sheet, color: T.ink }}>
          <h2 style={{ margin: 0, padding: '10px 6px 8px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Оглавление</h2>
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

        {toastEl}
      </div>
    </Frame>
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
      <div style={{ position: 'absolute', left: 16, right: 16, top: 52, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button aria-label="Свернуть текст" onClick={props.onClose} style={{ flex: 'none', width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surface, color: T.ink }}>{Icon.down()}</button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', marginRight: 54 }}>
          <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{props.title}</div>
          <div style={{ marginTop: 1, fontSize: 13, color: T.muted }}>{props.chapterLabel}</div>
        </div>
      </div>
      {quote && (
        <div style={{ position: 'absolute', left: 16, right: 16, top: 108, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, background: T.chip }}>
          {quote.taps % 2 === 1 ? 'Теперь на последнее' : 'Нажми на первое слово цитаты'}
        </div>
      )}
      <div
        ref={scroller}
        onClick={(e) => { const k = (e.target as HTMLElement).dataset.k; if (k) props.onWord(Number(k)); }}
        style={{ position: 'absolute', left: 0, right: 0, overflowY: 'auto', padding: '8px 24px 24px', top: quote ? 160 : 108, bottom: quote ? 250 : 104 }}
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
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 32, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: 8 }}>
          <button className="btn" style={{ background: T.chip, color: T.ink }} onClick={props.onStartQuote}>{Icon.quote()}Цитата</button>
          <button className="btn" style={{ background: T.btn, color: T.btnFg }} onClick={props.onReadHere}>{Icon.play(15)}Читать отсюда</button>
        </div>
      ) : (
        <div role="group" aria-label="Сохранить цитату" style={{ position: 'absolute', left: 16, right: 16, bottom: 28, borderRadius: 28, padding: 18, background: T.surface, boxShadow: '0 -12px 40px -24px rgba(23,20,15,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Новая цитата</span>
            <span className="num" style={{ fontSize: 13, color: T.muted }}>{props.quoteWords} {plural(props.quoteWords, 'слово', 'слова', 'слов')}</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
            <span aria-hidden="true" style={{ flex: 'none', width: 3, borderRadius: 2, background: 'linear-gradient(180deg, #FF8A3D, #FF5C8E)' }} />
            <blockquote style={{ margin: 0, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, lineHeight: '24px', maxHeight: 72, overflow: 'hidden' }}>«{props.quoteText}»</blockquote>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)', gap: 8 }}>
            <button className="btn" style={{ height: 52, background: T.chip, color: T.ink }} onClick={props.onCancelQuote}>Отмена</button>
            <button className="btn" style={{ height: 52, background: T.btn, color: T.btnFg }} onClick={props.onSaveQuote}>Сохранить цитату</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReaderSettings({ word }: { word: string }) {
  const st = useSettings();
  const T = THEMES[st.theme];
  const font = FONTS[st.font];
  const card: React.CSSProperties = { borderRadius: 22, padding: 12, background: T.card };
  const sel = (on: boolean): React.CSSProperties => ({ background: on ? T.btn : T.chip, color: on ? T.btnFg : T.ink });
  return (
    <div>
      <h2 style={{ margin: 0, padding: '10px 6px 0', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Настройки чтения</h2>
      <div style={{ marginTop: 14, borderRadius: 24, height: 92, position: 'relative', overflow: 'hidden', background: T.bg }}>
        <span className="tick" style={{ top: 10, height: 12, background: st.orp ? T.orp : T.muted }} />
        <span className="tick" style={{ bottom: 10, height: 12, background: st.orp ? T.orp : T.muted }} />
        <Word word={word} base={Math.round(SIZES[st.size] * 0.78)} left={108} right={196} fontCss={font.css} k={font.k} color={st.orp ? T.orp : T.ink} />
      </div>
      <div style={{ marginTop: 16, padding: '0 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Скорость</span>
        <span className="num" style={{ fontSize: 15 }}><b style={{ fontWeight: 700 }}>{st.wpm}</b> <span style={{ color: T.muted }}>сл/мин</span></span>
      </div>
      <div style={{ margin: '12px 6px 0' }}><Range min={150} max={800} step={10} value={st.wpm} onChange={(v) => setSettings({ wpm: v })} label="Скорость, слов в минуту" /></div>
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
          <Switch on={st.orp} onChange={(v) => setSettings({ orp: v })} label="Точка фокуса" color={T.orp} off={T.chip} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>Плавный разгон</div><div style={{ fontSize: 13, marginTop: 2, color: T.muted }}>После паузы первые слова идут медленнее</div></div>
          <Switch on={st.ramp} onChange={(v) => setSettings({ ramp: v })} label="Плавный разгон" color={T.orp} off={T.chip} />
        </div>
      </div>
    </div>
  );
}
