import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Orb, Word } from '../components/ui';
import { Frame } from '../components/Frame';
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
  const [count, setCount] = useState(0);


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

  const muted = '#6E675D';
  const abs = (st: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...st });
  const mainBtn: React.CSSProperties = { width: '100%', height: 58, border: 0, borderRadius: 29, background: '#17140F', color: '#FFFFFF', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' };

  return (
    <Frame>
      <div style={abs({ left: 16, right: 16, top: 52, display: 'flex', alignItems: 'center', gap: 14, zIndex: 2 })}>
        <button aria-label="Закрыть тест" onClick={() => nav(-1)} style={{ flex: 'none', width: 44, height: 44, borderRadius: 22, background: '#FFFFFF', color: '#17140F', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(23,20,15,0.08)' }}>{Icon.close(18)}</button>
        {stage !== 'intro' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 4, marginRight: 58 }}>
            {[0, 1, 2, 3, 4, 5].map((k) => <span key={k} style={{ height: 4, borderRadius: 2, transition: 'background .3s ease', background: k < stepIndex ? '#17140F' : k === stepIndex ? 'linear-gradient(90deg, #FF8A3D, #FF5C8E)' : '#E8E3DB' }} />)}
          </div>
        )}
      </div>

      {stage === 'intro' && (
        <>
          <div style={abs({ left: 0, right: 0, top: 118, display: 'flex', justifyContent: 'center' })}><Orb size={250} /></div>
          <div style={abs({ left: 28, right: 28, top: 382 })}>
            <div style={{ fontSize: 15, color: muted }}>≈ 2 минуты</div>
            <h1 style={{ margin: '6px 0 0', fontSize: 38, lineHeight: '41px', fontWeight: 800, letterSpacing: '-0.02em' }}>Проверь свой<br />темп</h1>
            <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: '25px', color: muted }}>Ты прочитаешь два коротких отрывка на разной скорости и ответишь на вопросы. В конце покажем, какая скорость тебе подходит.</p>
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rounds.map((x, k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15 }}>
                  <span style={{ flex: 'none', width: 28, height: 28, borderRadius: 14, background: '#F3EFE9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{k + 1}</span>
                  Отрывок на {x.wpm} сл/мин и 2 вопроса
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {stage === 'ready' && (
        <div style={abs({ left: 28, right: 28, top: 210 })}>
          <div style={{ fontSize: 15, color: muted }}>отрывок {r + 1} из 2</div>
          <div className="num" style={{ marginTop: 8, fontSize: 104, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.05em' }}>{R.wpm}</div>
          <div style={{ marginTop: 10, fontSize: 18, color: muted }}>слов в минуту</div>
          <p style={{ margin: '34px 0 0', fontSize: 17, lineHeight: '25px', color: muted }}>Текст начнётся сам и займёт около {secs} секунд. Поставить на паузу не получится.</p>
        </div>
      )}

      {stage === 'read' && (
        <>
          <div style={abs({ left: 28, right: 28, top: 150, fontSize: 15, color: muted })}>отрывок {r + 1}, {R.wpm} сл/мин</div>
          <div style={abs({ left: 20, right: 20, top: 307, height: 230, background: '#FFFFFF', borderRadius: 32, boxShadow: '0 1px 0 rgba(23,20,15,0.03), 0 18px 40px -24px rgba(70,45,10,0.28)', overflow: 'hidden' })}>
            <span style={abs({ left: '38%', top: 42, width: 2, height: 22, marginLeft: -1, borderRadius: 1, background: '#FF8A3D' })} />
            <span style={abs({ left: '38%', bottom: 42, width: 2, height: 22, marginLeft: -1, borderRadius: 1, background: '#FF5C8E' })} />
            {count > 0
              ? <span key={count} className="num count-in" style={abs({ left: '38%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 })}>{count}</span>
              : <Word word={R.words[i]} base={46} left={117} right={201} fontCss="var(--serif)" gradient />}
          </div>
          <div style={abs({ left: 28, right: 28, top: 549, textAlign: 'center', fontSize: 14, color: muted, transition: 'opacity .3s ease', opacity: count > 0 ? 1 : 0 })}>Смотри на место между метками</div>
          <div style={abs({ left: 28, right: 28, top: 585 })}>
            <div style={{ height: 4, borderRadius: 2, background: '#EFEAE2', overflow: 'hidden' }}><div style={{ height: '100%', background: '#17140F', transition: 'width .2s linear', width: (i / (R.words.length - 1)) * 100 + '%' }} /></div>
          </div>
        </>
      )}

      {stage === 'q' && (
        <>
          <div style={abs({ left: 28, right: 28, top: 150 })}>
            <div style={{ fontSize: 15, color: muted }}>вопрос {q + 1} из 2, отрывок {r + 1}</div>
            <h1 style={{ margin: '10px 0 0', fontSize: 30, lineHeight: '35px', fontWeight: 800, letterSpacing: '-0.02em' }}>{R.qs[q].q}</h1>
          </div>
          <div style={abs({ left: 20, right: 20, top: 330, display: 'flex', flexDirection: 'column', gap: 10 })}>
            {R.qs[q].options.map((o, k) => (
              <button key={k} aria-pressed={picked === k} onClick={() => answer(k)} style={{ textAlign: 'left', minHeight: 64, padding: '14px 18px', borderRadius: 22, fontSize: 17, lineHeight: '22px', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color .2s ease', background: '#FFFFFF', border: `2px solid ${picked === k ? '#17140F' : '#FFFFFF'}` }}>
                <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 15, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: picked === k ? '#17140F' : '#F3EFE9', color: picked === k ? '#FFFFFF' : '#17140F' }}>{'АБВ'[k]}</span>
                <span style={{ flex: 1 }}>{o}</span>
              </button>
            ))}
          </div>
          <div style={abs({ left: 28, right: 28, top: 560, fontSize: 14, lineHeight: '20px', color: muted })}>Если сомневаешься, выбери наугад. Правильные ответы покажем в конце.</div>
        </>
      )}

      {stage === 'result' && result && (
        <div style={abs({ left: 28, right: 28, top: 120 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: -16 }}><Orb size={96} mood="happy" /><div style={{ fontSize: 15, color: muted }}>тебе подходит</div></div>
          <div className="num" style={{ marginTop: 2, fontSize: 112, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.05em' }}>{result.rec}</div>
          <div style={{ marginTop: 10, fontSize: 18, color: muted }}>слов в минуту, ≈ {Math.round((result.rec * 60) / 250)} страниц в час</div>
          <div style={{ marginTop: 24, background: '#FFFFFF', borderRadius: 24, padding: '4px 16px' }}>
            {[0, 1].map((k) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: `1px solid ${k === 0 ? '#F3EFE9' : 'transparent'}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Отрывок {k + 1}, {rounds[k].wpm} сл/мин</div>
                  <div style={{ marginTop: 2, fontSize: 13, color: muted }}>{score(k)} из 2 правильно</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {rounds[k].qs.map((x, j) => {
                    const ok = answers[k][j] === x.ok;
                    return <span key={j} aria-label={ok ? 'верно' : 'ошибка'} style={{ width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: ok ? '#17140F' : '#FFE3E8', color: ok ? '#FFFFFF' : '#C2185B' }}>{ok ? '✓' : '×'}</span>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: '22px', color: muted }}>{result.text}</p>
        </div>
      )}

      <div style={abs({ left: 20, right: 20, bottom: 36, display: 'flex', flexDirection: 'column', gap: 6 })}>
        {stage === 'intro' && <button style={mainBtn} onClick={() => setStage('ready')}>Начать тест{Icon.arrow()}</button>}
        {stage === 'ready' && <button style={mainBtn} onClick={() => setStage('read')}>Поехали{Icon.arrow()}</button>}
        {stage === 'result' && result && (
          <>
            <button style={mainBtn} onClick={() => { setSettings({ wpm: result.rec }); nav('/'); }}>Готово</button>
            <button onClick={() => { setRounds(makeRounds()); setAnswers([[null, null], [null, null]]); setR(0); setQ(0); setStage('intro'); }} style={{ height: 48, fontSize: 15, fontWeight: 600 }}>Пройти ещё раз</button>
          </>
        )}
      </div>
    </Frame>
  );
}
