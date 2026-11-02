import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Orb, Word } from '../components/ui';
import { PACE_TEXTS } from '../data/paceTexts';
import { shuffle } from '../lib/format';
import { getSettings, setSettings } from '../lib/settings';
import { wordDelay } from '../lib/rsvp';

type Stage = 'intro' | 'ready' | 'read' | 'q' | 'result';
interface Round { wpm: number; source: string; words: string[]; qs: { q: string; options: string[]; ok: number }[] }

const SEEN = 'cheatread:paceSeen';

function makeRounds(): Round[] {
  let seen: string[] = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { /* ignore */ }
  const fresh = PACE_TEXTS.filter((t) => !seen.includes(t.id));
  const pool = fresh.length >= 2 ? fresh : PACE_TEXTS;
  const picked = shuffle(pool).slice(0, 2);
  try { localStorage.setItem(SEEN, JSON.stringify([...seen, ...picked.map((p) => p.id)].slice(-3))); } catch { /* ignore */ }
  const r1 = Math.max(200, Math.min(500, Math.round((getSettings().wpm - 40) / 10) * 10));
  return picked.map((t, k) => ({
    wpm: k === 0 ? r1 : r1 + 100,
    source: t.source,
    words: t.text.split(/\s+/),
    qs: shuffle(t.questions).slice(0, 2).map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return { q: q.q, options: order.map((i) => q.options[i]), ok: order.indexOf(q.ok) };
    }),
  }));
}

export default function PaceTest() {
  const nav = useNavigate();
  const [rounds, setRounds] = useState<Round[]>(makeRounds);
  const [stage, setStage] = useState<Stage>('intro');
  const [r, setR] = useState(0);
  const [q, setQ] = useState(0);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[][]>([[null, null], [null, null]]);
  const [picked, setPicked] = useState<number | null>(null);
  const [w, setW] = useState(350);
  const [count, setCount] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { if (box.current) setW(box.current.clientWidth); }, [stage]);

  useEffect(() => {
    if (stage !== 'read') return;
    const words = rounds[r].words;
    let k = 0;
    let t: number;
    let c = 3;
    const countdown = () => {
      setCount(c);
      t = window.setTimeout(() => {
        c -= 1;
        if (c > 0) countdown();
        else { setCount(0); setI(0); t = window.setTimeout(run, 700); }
      }, 800);
    };
    const run = () => {
      t = window.setTimeout(() => {
        k += 1;
        if (k >= words.length) { setStage('q'); setQ(0); setPicked(null); return; }
        setI(k);
        run();
      }, wordDelay(words[k], { wpm: rounds[r].wpm, punct: 'soft', ramp: false, sincePause: 10 }));
    };
    setI(0);
    countdown();
    return () => clearTimeout(t);
  }, [stage, r, rounds]);

  const score = (k: number) => rounds[k].qs.filter((x, j) => answers[k][j] === x.ok).length;
  const result = useMemo(() => {
    if (stage !== 'result') return null;
    const [a, b] = [score(0), score(1)];
    const r1 = rounds[0].wpm, r2 = rounds[1].wpm;
    if (a === 2 && b === 2) return { rec: r2, text: `На ${r2} слов в минуту все ответы верные. Можно читать на этой скорости.` };
    if (a === 2 && b === 1) { const rec = Math.round((r1 + r2) / 20) * 10; return { rec, text: `На ${r1} все ответы верные, на ${r2} одна ошибка. Советуем ${rec}.` }; }
    if (a === 2) { const rec = r1 + 20; return { rec, text: `На ${r1} все ответы верные, на ${r2} обе ошибки. Советуем ${rec}.` }; }
    const rec = Math.max(180, r1 - (a === 1 ? 30 : 60));
    return { rec, text: `Ошибки были уже на ${r1}. Советуем начать с ${rec} и ускоряться постепенно.` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const answer = (k: number) => {
    if (picked !== null) return;
    const next = answers.map((x) => x.slice());
    next[r][q] = k;
    setAnswers(next);
    setPicked(k);
    setTimeout(() => {
      setPicked(null);
      if (q === 0) setQ(1);
      else if (r === 0) { setR(1); setStage('ready'); }
      else setStage('result');
    }, 450);
  };

  const stepIndex = stage === 'intro' ? -1 : stage === 'result' ? 6 : r * 3 + (stage === 'q' ? 1 + q : 0);
  const R = rounds[r];
  const secs = Math.round((R.words.length / R.wpm) * 60 * 1.25);

  return (
    <div className="fill" style={{ padding: 0 }}>
      <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(var(--safe-top) + 12px)', display: 'flex', alignItems: 'center', gap: 14, zIndex: 2 }}>
        <button className="icon-btn" aria-label="Закрыть тест" onClick={() => nav(-1)}>{Icon.close()}</button>
        {stage !== 'intro' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginRight: 58 }}>
            {[0, 1, 2, 3, 4, 5].map((k) => <span key={k} style={{ height: 4, borderRadius: 2, background: k < stepIndex ? 'var(--ink)' : k === stepIndex ? 'linear-gradient(90deg, #FF8A3D, #FF5C8E)' : '#E8E3DB' }} />)}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--safe-top) + 80px) 24px calc(var(--safe-bottom) + 24px)' }}>
        {stage === 'intro' && (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Orb size={230} /></div>
            <div className="small">≈ 2 минуты</div>
            <h1 className="h-display" style={{ marginTop: 6 }}>Проверь свой<br />темп</h1>
            <p className="body" style={{ marginTop: 14 }}>Ты прочитаешь два коротких отрывка на разной скорости и ответишь на вопросы. В конце покажем, какая скорость тебе подходит.</p>
            <div style={{ flex: 0.6, minHeight: 20 }} />
            <button className="btn btn-dark" onClick={() => setStage('ready')}>Начать тест{Icon.arrow()}</button>
          </>
        )}

        {stage === 'ready' && (
          <>
            <div style={{ flex: 1 }} />
            <div className="small">отрывок {r + 1} из 2</div>
            <div className="num" style={{ marginTop: 8, fontSize: 104, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.05em' }}>{R.wpm}</div>
            <div style={{ marginTop: 10, fontSize: 18, color: 'var(--muted)' }}>слов в минуту</div>
            <p className="body" style={{ marginTop: 30 }}>Текст начнётся сам и займёт около {secs} секунд. Поставить на паузу не получится.</p>
            <div style={{ flex: 1.2 }} />
            <button className="btn btn-dark" onClick={() => setStage('read')}>Поехали{Icon.arrow()}</button>
          </>
        )}

        {stage === 'read' && (
          <>
            <div style={{ flex: 1 }} />
            <div className="small">отрывок {r + 1}, {R.wpm} сл/мин</div>
            <div ref={box} style={{ position: 'relative', margin: '14px -4px 0', height: 210, borderRadius: 32, background: '#fff', boxShadow: '0 18px 40px -24px rgba(70,45,10,0.28)', overflow: 'hidden' }}>
              <span className="tick" style={{ top: 36, height: 20, background: '#FF8A3D' }} />
              <span className="tick" style={{ bottom: 36, height: 20, background: '#FF5C8E' }} />
              {count > 0
                ? <span key={count} className="num count-in" style={{ position: 'absolute', left: '38%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink)' }}>{count}</span>
                : <Word word={R.words[i]} base={44} left={w * 0.38 - 16} right={w * 0.62 - 16} fontCss="var(--serif)" gradient />}
            </div>
            <div className="small" style={{ marginTop: 12, textAlign: 'center', opacity: count > 0 ? 1 : 0, transition: 'opacity .3s ease' }}>Смотри на место между метками</div>
            <div style={{ marginTop: 20, height: 4, borderRadius: 2, background: '#EFEAE2', overflow: 'hidden' }}><div style={{ height: '100%', width: (i / (R.words.length - 1)) * 100 + '%', background: 'var(--ink)', transition: 'width .2s linear' }} /></div>
            <div style={{ flex: 1.3 }} />
          </>
        )}

        {stage === 'q' && (
          <>
            <div className="small" style={{ marginTop: 20 }}>вопрос {q + 1} из 2, отрывок {r + 1}</div>
            <h1 className="h1" style={{ marginTop: 10, fontSize: 30, lineHeight: '35px' }}>{R.qs[q].q}</h1>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {R.qs[q].options.map((o, k) => (
                <button key={k} aria-pressed={picked === k} onClick={() => answer(k)} className="card" style={{ minHeight: 64, padding: '14px 18px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', fontSize: 17, lineHeight: '22px', border: `2px solid ${picked === k ? 'var(--ink)' : '#fff'}` }}>
                  <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 15, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: picked === k ? 'var(--ink)' : 'var(--chip)', color: picked === k ? '#fff' : 'var(--ink)' }}>{'АБВ'[k]}</span>
                  {o}
                </button>
              ))}
            </div>
            <p className="small" style={{ marginTop: 18, lineHeight: '20px' }}>Если сомневаешься, выбери наугад. Правильные ответы покажем в конце.</p>
          </>
        )}

        {stage === 'result' && result && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: -16, marginTop: 20 }}><Orb size={96} mood="happy" /><span className="small">тебе подходит</span></div>
            <div className="num" style={{ fontSize: 112, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.05em' }}>{result.rec}</div>
            <div style={{ marginTop: 10, fontSize: 18, color: 'var(--muted)' }}>слов в минуту, ≈ {Math.round((result.rec * 60) / 250)} страниц в час</div>
            <div className="card" style={{ marginTop: 24, borderRadius: 24, padding: '4px 16px' }}>
              {[0, 1].map((k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: k === 0 ? '1px solid #F3EFE9' : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Отрывок {k + 1}, {rounds[k].wpm} сл/мин</div>
                    <div className="meta" style={{ marginTop: 2 }}>{rounds[k].source}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {rounds[k].qs.map((x, j) => {
                      const ok = answers[k][j] === x.ok;
                      return <span key={j} aria-label={ok ? 'верно' : 'ошибка'} style={{ width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: ok ? 'var(--ink)' : '#FFE3E8', color: ok ? '#fff' : '#C2185B' }}>{ok ? '✓' : '×'}</span>;
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="small" style={{ marginTop: 16, fontSize: 15, lineHeight: '22px' }}>{result.text}</p>
            <div style={{ flex: 1 }} />
            <button className="btn btn-dark" onClick={() => { setSettings({ wpm: result.rec }); nav('/'); }}>Готово</button>
            <div className="meta" style={{ textAlign: 'center', marginTop: 8 }}>Скорость чтения станет {result.rec} сл/мин</div>
            <button className="btn-text" onClick={() => { setRounds(makeRounds()); setAnswers([[null, null], [null, null]]); setR(0); setQ(0); setStage('intro'); }}>Пройти ещё раз</button>
          </>
        )}
      </div>
    </div>
  );
}
