import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Logo, Orb, Range, Word } from '../components/ui';
import { setSettings } from '../lib/settings';
import { wordDelay } from '../lib/rsvp';

const DEMO = 'Просто смотри сюда. Слова будут меняться сами. Непривычно только первые пару минут.'.split(' ');

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [k, setK] = useState(0);
  const [wpm, setWpm] = useState(270);
  const [w, setW] = useState(358);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step !== 1) return;
    let t: number;
    let i = 0;
    const run = () => {
      t = window.setTimeout(() => { i = (i + 1) % DEMO.length; setK(i); run(); }, wordDelay(DEMO[i], { wpm: 230, punct: 'soft', ramp: false, sincePause: 10 }));
    };
    setK(0);
    run();
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => { if (box.current) setW(box.current.clientWidth); }, [step]);

  const finish = () => { setSettings({ onboarded: true, wpm }); nav('/', { replace: true }); };

  return (
    <div className="fill" style={{ padding: 0 }}>
      <div style={{ position: 'absolute', left: 28, right: 16, top: 'calc(var(--safe-top) + 12px)', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
        {step === 0 ? <Logo width={120} /> : (
          <button className="icon-btn" style={{ marginLeft: -12 }} aria-label="Назад" onClick={() => setStep(step - 1)}>{Icon.back()}</button>
        )}
        <button onClick={finish} style={{ height: 44, padding: '0 8px', fontSize: 16, color: 'var(--muted)' }}>Пропустить</button>
      </div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--safe-top) + 72px) 28px calc(var(--safe-bottom) + 24px)' }}>
        {step === 0 && (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}><Orb size={290} /></div>
            <h1 className="h-display" style={{ fontSize: 40, lineHeight: '42px' }}>Читай<br />быстрее</h1>
            <p className="body" style={{ marginTop: 14 }}>Слова появляются по одному в одном месте. Глазам не нужно бегать по строкам.</p>
            <div style={{ flex: 0.5, minHeight: 24 }} />
          </>
        )}
        {step === 1 && (
          <>
            <div style={{ flex: 1, minHeight: 20 }} />
            <h1 className="h-display" style={{ fontSize: 40, lineHeight: '42px' }}>Смотри на<br />цветную букву</h1>
            <div ref={box} style={{ position: 'relative', margin: '28px -8px 0', height: 220, borderRadius: 32, background: '#fff', boxShadow: '0 18px 40px -24px rgba(70,45,10,0.28)', overflow: 'hidden' }}>
              <span className="tick" style={{ top: 40, height: 22, background: '#FF8A3D' }} />
              <span className="tick" style={{ bottom: 40, height: 22, background: '#FF5C8E' }} />
              <Word word={DEMO[k]} base={48} left={w * 0.38 - 16} right={w * 0.62 - 16} fontCss="var(--serif)" gradient />
            </div>
            <p className="body" style={{ marginTop: 24 }}>Смотри на неё, а не на всё слово. Так слово узнаётся быстрее.</p>
            <div style={{ flex: 1.3 }} />
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ flex: 1, minHeight: 20 }} />
            <div className="num" style={{ fontSize: 120, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.05em', marginLeft: -4 }}>{wpm}</div>
            <div style={{ marginTop: 10, fontSize: 18, color: 'var(--muted)' }}>слов в минуту</div>
            <div style={{ marginTop: 28 }}><Range min={150} max={600} step={10} value={wpm} onChange={setWpm} label="Стартовая скорость, слов в минуту" /></div>
            <div style={{ marginTop: 32, fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>≈ {Math.round((wpm * 60) / 250)} страниц в час</div>
            <p className="body" style={{ marginTop: 12 }}>Обычно люди читают 200–250 слов в минуту. Выбери удобную скорость, потом её можно поменять.</p>
            <div style={{ flex: 1.3 }} />
          </>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {[0, 1, 2].map((d) => <span key={d} style={{ height: 8, borderRadius: 4, width: d === step ? 30 : 8, background: d === step ? 'var(--ink)' : '#DDD7CD', transition: 'width .3s ease' }} />)}
        </div>
        <button className="btn btn-dark" style={{ height: 58, borderRadius: 29, fontSize: 17 }} onClick={() => (step < 2 ? setStep(step + 1) : finish())}>
          {step === 0 ? 'Начать' : step === 1 ? 'Дальше' : 'Начать'}{Icon.arrow()}
        </button>
      </div>
    </div>
  );
}
