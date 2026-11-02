import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Frame } from '../components/Frame';
import { Orb } from '../components/ui';
import { orp, fitFontSize } from '../lib/rsvp';

/* Знакомство с приложением, макет «1.1 · Знакомство, вариант Б» 1 в 1:
   в мини-телефоне «палец» нажимает кнопку, и показывается результат. */

type Step = { title: string; text: string; from: [number, number]; to: [number, number] };

const STEPS: Step[] = [
  { title: 'Добавь текст', text: 'Нажми плюс сверху. Подойдёт файл TXT, EPUB или FB2, а можно вставить скопированный текст.', from: [116, 400], to: [167, 29] },
  { title: 'Запусти чтение', text: 'Нажми «Продолжить чтение». Слова пойдут по одному, смотри на оранжевую букву. Тап по слову ставит паузу.', from: [116, 420], to: [116, 298] },
  { title: 'Книги в библиотеке', text: 'Вторая вкладка внизу. Там все твои книги и прогресс по каждой.', from: [116, 300], to: [132, 436] },
  { title: 'Профиль и настройки', text: 'Кружок с буквой справа сверху: имя, цель на день и скорость. Шрифт и тему меняешь прямо в читалке.', from: [116, 400], to: [203, 29] },
];

const WORDS = 'Говорили, что на набережной появилось новое лицо: дама с собачкой.'.split(' ');

const COVERS = [
  { t: 'Дама с собачкой', bg: '#2E3A2D', p: '38%' },
  { t: 'Анна Каренина', bg: '#7A1F23', p: '12%' },
  { t: 'Микроэкономика', bg: '#C85A2E', p: '64%' },
  { t: 'Евгений Онегин', bg: '#1F2A44', p: '100%' },
  { t: 'Лекция 5', bg: '#5B4A8A', p: '0%' },
  { t: 'Нос', bg: '#8A6A2E', p: '0%' },
];

const muted = '#706C64';
const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...s });

const IcPlus = ({ s = 14, w = 2.4 }: { s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
const IcHome = ({ s = 14 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z" /></svg>;
const IcLib = ({ s = 14 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 4h3.5v16H4.5z" /><path d="M10 4h3.5v16H10z" /><path d="M15.4 5.3l3.2-.9 3.4 15-3.2.9z" /></svg>;
const IcStats = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 20v-8" /><path d="M12 20V5" /><path d="M19 20v-5" /></svg>;

const navBar: React.CSSProperties = abs({ left: 10, right: 10, bottom: 12, height: 40, borderRadius: 20, background: '#161513', display: 'flex', alignItems: 'center', padding: 4, boxSizing: 'border-box', gap: 3 });
const navPill: React.CSSProperties = { flex: 1.6, height: 32, borderRadius: 16, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10, fontWeight: 600 };
const navIcon: React.CSSProperties = { flex: 1, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5B0A7' };
const chip = (on: boolean): React.CSSProperties => ({ height: 24, padding: '0 10px', borderRadius: 12, background: on ? '#161513' : '#FFFFFF', color: on ? '#FFFFFF' : '#161513', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center' });

export default function Tour() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [ph, setPh] = useState(0);
  const [w, setW] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let wi = 0;
    const clear = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; clearInterval(wi); };
    const play = () => {
      clear();
      const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
      setPh(0); setW(0);
      at(500, () => setPh(1));
      at(1300, () => setPh(2));
      at(1550, () => {
        setPh(3);
        if (i === 1) { let k = 0; wi = window.setInterval(() => { k = (k + 1) % WORDS.length; setW(k); }, 300); }
      });
      at(5200, play);
    };
    play();
    return clear;
  }, [i]);

  const s = STEPS[i];
  const p = ph === 0 ? s.from : s.to;
  const shown = ph === 3;
  const o = orp(WORDS[w]);
  const wordSize = fitFontSize(o, 26, 64, 110, 1);
  const last = i === STEPS.length - 1;
  const done = () => nav('/', { replace: true });
  const resLayer = (extra: React.CSSProperties = {}): React.CSSProperties => abs({ inset: 0, background: '#FCFBF8', transition: 'opacity .35s ease', opacity: shown ? 1 : 0, ...extra });

  return (
    <Frame>
      <div style={abs({ left: 16, right: 16, top: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <span style={{ paddingLeft: 8, fontSize: 15, color: muted, fontVariantNumeric: 'tabular-nums' }}>{i + 1} из {STEPS.length}</span>
        <button onClick={done} style={{ height: 44, padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: 16, color: '#6E675D' }}>Пропустить</button>
      </div>

      <div style={abs({ left: '50%', top: 104, marginLeft: -122, width: 244, height: 480, boxSizing: 'border-box', padding: 6, borderRadius: 38, background: '#161513', boxShadow: '0 30px 60px -30px rgba(60,30,5,0.45)' })}>
        <div aria-hidden="true" style={{ position: 'relative', width: 232, height: 468, borderRadius: 32, overflow: 'hidden', background: '#FCFBF8' }}>

          <div style={abs({ left: 16, top: 22, fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' })}>chea<span style={{ color: '#FF6F6A' }}>t</span>read</div>
          <span style={abs({ left: 152, top: 14, width: 30, height: 30, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(22,21,19,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}><IcPlus /></span>
          <span style={abs({ left: 188, top: 14, width: 30, height: 30, borderRadius: 15, background: '#161513', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 })}>П</span>
          <div style={abs({ left: 16, top: 62, fontSize: 19, lineHeight: '21px', fontWeight: 700, letterSpacing: '-0.02em' })}>Добрый день</div>

          {i === 0 ? (
            <div style={abs({ left: 10, right: 10, top: 96, height: 224, borderRadius: 22, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4px 14px 0', boxSizing: 'border-box' })}>
              <Orb size={110} mood="sleepy" tone="soft" />
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>Добавь первую книгу</div>
              <div style={{ marginTop: 4, fontSize: 10, lineHeight: '14px', color: muted }}>Файл или скопированный текст</div>
              <span style={{ marginTop: 12, alignSelf: 'stretch', height: 32, borderRadius: 16, background: '#161513' }} />
            </div>
          ) : (
            <>
              <div style={abs({ left: 10, right: 10, top: 96, height: 230, borderRadius: 22, background: '#FFE7E3', overflow: 'hidden' })}>
                <div style={abs({ left: '50%', top: 30, marginLeft: -80 })}><Orb size={160} /></div>
                <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 22, padding: '12px 14px', boxShadow: '0 8px 20px -14px rgba(120,60,10,0.4)' }}>
                  <div style={{ fontSize: 16, lineHeight: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>Дама с собачкой</div>
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: muted }}><span>А. П. Чехов</span><span><b style={{ color: '#161513', fontWeight: 600 }}>38%</b> / 14 мин</span></div>
                  <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: '#EFECE5' }}><div style={{ width: '38%', height: '100%', borderRadius: 2, background: '#161513' }} /></div>
                </div>
                <span style={abs({ left: '50%', bottom: 12, marginLeft: -66, width: 132, height: 32, borderRadius: 16, background: '#161513', color: '#FFFFFF', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'transform .15s ease', transform: i === 1 && ph === 2 ? 'scale(.94)' : 'scale(1)' })}>
                  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /></svg>
                  Продолжить чтение
                </span>
              </div>
              <div style={abs({ left: 10, right: 10, top: 336, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 })}>
                <span style={{ height: 52, borderRadius: 16, background: '#FFFFFF' }} />
                <span style={{ height: 52, borderRadius: 16, background: '#FFFFFF' }} />
              </div>
            </>
          )}

          <div style={navBar}>
            <span style={navPill}><IcHome s={12} />Главная</span>
            <span style={{ ...navIcon, transition: 'transform .15s ease', transform: i === 2 && ph === 2 ? 'scale(.86)' : 'scale(1)' }}><IcLib /></span>
            <span style={navIcon}><IcStats /></span>
          </div>

          {i === 0 && (
            <>
              <div style={abs({ inset: 0, background: 'rgba(22,21,19,0.32)', transition: 'opacity .35s ease', opacity: shown ? 1 : 0 })} />
              <div style={abs({ left: 0, right: 0, bottom: 0, borderRadius: '24px 24px 0 0', background: '#FCFBF8', padding: '8px 12px 16px', transition: 'transform .45s cubic-bezier(.2,.8,.2,1)', transform: shown ? 'translateY(0)' : 'translateY(105%)' })}>
                <div style={{ width: 30, height: 4, borderRadius: 2, margin: '0 auto', background: '#E3DED5' }} />
                <div style={{ margin: '12px 4px 0', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Новый текст</div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { t: 'Файл', d: 'TXT, EPUB, FB2', bg: '#FFE7E3', ic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg> },
                    { t: 'Вставить текст', d: 'из буфера обмена', bg: '#F3EFE9', ic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2" strokeLinejoin="round"><path d="M8 4h8v3H8z" /><path d="M6 6h12v15H6z" /></svg> },
                  ].map((r) => (
                    <span key={r.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, background: '#FFFFFF' }}>
                      <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 15, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.ic}</span>
                      <span><span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{r.t}</span><span style={{ display: 'block', fontSize: 10, color: muted }}>{r.d}</span></span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {i === 1 && (
            <div style={resLayer()}>
              <div style={abs({ left: 0, right: 0, top: 22, textAlign: 'center', fontSize: 11, fontWeight: 600, opacity: 0.35 })}>Дама с собачкой</div>
              <div style={abs({ left: 12, right: 12, top: 150, height: 120, borderRadius: 22, background: '#FFFFFF', boxShadow: '0 12px 26px -18px rgba(70,45,10,0.35)', overflow: 'hidden' })}>
                <span style={abs({ left: '38%', top: 20, width: 2, height: 14, marginLeft: -1, borderRadius: 1, background: '#FF8A3D' })} />
                <span style={abs({ left: '38%', bottom: 20, width: 2, height: 14, marginLeft: -1, borderRadius: 1, background: '#FF5C8E' })} />
                <span style={abs({ left: '38%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'baseline', fontFamily: "'Literata', Georgia, serif", fontSize: wordSize, fontWeight: 500, lineHeight: 1.4, whiteSpace: 'nowrap' })}>
                  <span style={{ flex: 'none', width: 200, textAlign: 'right' }}>{o.pre}</span>
                  <span style={{ flex: 'none', display: 'inline-block', padding: '0 0.03em 0.12em', margin: '0 -0.03em -0.12em', background: 'linear-gradient(180deg, #FF8A3D, #FF5C8E)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{o.mid}</span>
                  <span style={{ flex: 'none', width: 200, textAlign: 'left' }}>{o.post}</span>
                </span>
              </div>
              <div style={abs({ left: 0, right: 0, top: 284, textAlign: 'center', fontSize: 10, color: muted })}>Тап по слову ставит паузу</div>
              <span style={abs({ left: '50%', bottom: 28, marginLeft: -21, width: 42, height: 42, borderRadius: 21, background: '#161513', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                <svg width="14" height="14" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="#FFFFFF" /><rect x="14" y="5" width="4" height="14" rx="1.5" fill="#FFFFFF" /></svg>
              </span>
            </div>
          )}

          {i === 2 && (
            <div style={resLayer()}>
              <div style={abs({ left: 16, top: 22, fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em' })}>Библиотека</div>
              <div style={abs({ left: 14, top: 58, display: 'flex', gap: 6 })}>
                <span style={chip(true)}>Все 4</span><span style={chip(false)}>Читаю 2</span><span style={chip(false)}>Прочитано 1</span>
              </div>
              <div style={abs({ left: 14, right: 14, top: 96, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px 8px' })}>
                {COVERS.map((c) => (
                  <span key={c.t}>
                    <span style={{ display: 'block', height: 88, borderRadius: '4px 8px 8px 4px', boxShadow: 'inset 2px 0 0 rgba(0,0,0,0.15)', padding: '7px 6px', boxSizing: 'border-box', color: 'rgba(255,255,255,0.9)', fontFamily: "'Literata', Georgia, serif", fontStyle: 'italic', fontSize: 9, lineHeight: '11px', background: c.bg }}>{c.t}</span>
                    <span style={{ display: 'block', marginTop: 6, height: 3, borderRadius: 2, background: '#EFECE5' }}><span style={{ display: 'block', height: '100%', borderRadius: 2, background: '#161513', width: c.p }} /></span>
                  </span>
                ))}
              </div>
              <div style={navBar}>
                <span style={navIcon}><IcHome /></span>
                <span style={navPill}><IcLib s={12} />Библиотека</span>
                <span style={navIcon}><IcStats /></span>
              </div>
            </div>
          )}

          {i === 3 && (
            <div style={resLayer()}>
              <div style={abs({ left: 0, right: 0, top: 22, textAlign: 'center', fontSize: 12, fontWeight: 600 })}>Профиль</div>
              <div style={abs({ left: 14, right: 14, top: 56, display: 'flex', alignItems: 'center', gap: 10 })}>
                <span style={{ flex: 'none', width: 48, height: 48, borderRadius: 24, background: '#161513', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>П</span>
                <span style={{ flex: 1, height: 36, borderRadius: 18, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px #ECE7DF', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 12 }}>Полина</span>
              </div>
              <div style={abs({ left: 10, right: 10, top: 122, borderRadius: 18, background: '#FFFFFF', padding: '4px 12px' })}>
                <div style={{ padding: '10px 0', borderBottom: '1px solid #F3EFE9' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Цель на день</div>
                  <div style={{ marginTop: 7, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 3, padding: 3, borderRadius: 12, background: '#F3EFE9' }}>
                    {['10 мин', '20 мин', '30 мин'].map((t) => <span key={t} style={{ height: 22, borderRadius: 9, background: t === '20 мин' ? '#FFFFFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{t}</span>)}
                  </div>
                </div>
                <div style={{ padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ fontWeight: 600 }}>Скорость</span><span><b>300</b> <span style={{ color: muted }}>сл/мин</span></span></div>
                  <div style={{ position: 'relative', marginTop: 10, height: 4, borderRadius: 2, background: '#EFECE5' }}>
                    <div style={{ width: '23%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #FF9A3C, #FF5C8E)' }} />
                    <span style={abs({ left: '23%', top: -6, width: 16, height: 16, marginLeft: -8, borderRadius: 8, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' })} />
                  </div>
                </div>
              </div>
              <div style={abs({ left: 10, right: 10, top: 262, borderRadius: 18, background: '#FFFFFF', padding: 12, display: 'flex', alignItems: 'center', gap: 10 })}>
                <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 15, background: '#F3EFE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2" strokeLinecap="round"><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h4" /><path d="M12 17h8" /><circle cx="10" cy="17" r="2" /></svg>
                </span>
                <span style={{ fontSize: 10, lineHeight: '14px', color: muted }}><b style={{ display: 'block', fontSize: 12, color: '#161513', fontWeight: 600 }}>Шрифт и тема</b>в читалке, кнопка справа сверху</span>
              </div>
            </div>
          )}

          <div style={abs({ left: p[0], top: p[1], width: 30, height: 30, margin: '-15px 0 0 -15px', transition: 'left .7s cubic-bezier(.4,0,.2,1), top .7s cubic-bezier(.4,0,.2,1), opacity .3s ease', opacity: ph === 3 ? 0 : 1, pointerEvents: 'none' })}>
            {ph === 2 && <span className="tour-ripple" style={abs({ inset: 0, borderRadius: 15, border: '2px solid #FF7A5C' })} />}
            <span style={abs({ inset: 0, borderRadius: 15, background: 'rgba(22,21,19,0.22)', border: '2px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', transition: 'transform .15s ease', transform: ph === 2 ? 'scale(.82)' : 'scale(1)' })} />
          </div>
        </div>
      </div>

      <div key={i} className="tour-text" style={abs({ left: 24, right: 24, top: 602 })}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '31px', fontWeight: 800, letterSpacing: '-0.02em' }}>{s.title}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 16, lineHeight: '23px', color: '#6E675D' }}>{s.text}</p>
      </div>

      <div aria-hidden="true" style={abs({ left: 0, right: 0, bottom: 108, display: 'flex', justifyContent: 'center', gap: 6 })}>
        {STEPS.map((_, k) => <span key={k} style={{ height: 6, borderRadius: 3, transition: 'width .3s ease, background .3s ease', width: k === i ? 22 : 6, background: k === i ? 'linear-gradient(90deg, #FF8A3D, #FF5C8E)' : '#E3DFD6' }} />)}
      </div>

      <div style={abs({ left: 20, right: 20, bottom: 36, display: 'flex', alignItems: 'center', gap: 12 })}>
        {i > 0 && (
          <button onClick={() => setI(i - 1)} aria-label="Назад" style={{ flex: 'none', width: 58, height: 58, border: 0, borderRadius: 29, background: '#FFFFFF', color: '#161513', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(22,21,19,0.08)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        )}
        <button onClick={() => (last ? done() : setI(i + 1))} style={{ flex: 1, height: 58, border: 0, borderRadius: 29, background: '#161513', color: '#FFFFFF', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
          {last ? 'Начать' : 'Дальше'}
          {!last && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>}
        </button>
      </div>
    </Frame>
  );
}
