import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Logo, Orb, Word } from '../components/ui';
import { setSettings } from '../lib/settings';

/* Экран повторяет макет «1 · Онбординг» 1 в 1: кадр 390×844, позиции как в макете.
   На экранах другого размера кадр пропорционально масштабируется. */

const DEMO = 'Просто смотри сюда. Слова будут меняться сами. Непривычно только первые пару минут.'.split(' ');

function useFrameScale() {
  const calc = () => Math.min(window.innerWidth / 390, window.innerHeight / 844);
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

const muted = '#6E675D';
const ink = '#17140F';

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [k, setK] = useState(0);
  const [wpm, setWpm] = useState(270);
  const scale = useFrameScale();

  useEffect(() => {
    if (step !== 1) return;
    let t: number;
    let i = 0;
    const run = () => {
      const word = DEMO[i];
      let d = 60000 / 230;
      if (/[.!?…]$/.test(word)) d *= 2.4;
      else if (/[,;:]$/.test(word) || word === '—') d *= 1.5;
      t = window.setTimeout(() => { i = (i + 1) % DEMO.length; setK(i); run(); }, d);
    };
    setK(0);
    run();
    return () => clearTimeout(t);
  }, [step]);

  const finish = () => { setSettings({ onboarded: true, wpm }); nav('/', { replace: true }); };
  const frac = (wpm - 150) / (600 - 150);
  const fillW = `calc(52px + (100% - 52px) * ${frac.toFixed(3)})`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FCFBF8', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 390, height: 844, marginLeft: -195, marginTop: -422, transform: `scale(${scale})`, color: '#161513', fontFamily: "'Inter Tight', system-ui, sans-serif" }}>

        {step === 0 && (
          <div style={{ position: 'absolute', left: 28, top: 52, height: 44, display: 'flex', alignItems: 'center', zIndex: 2 }}>
            <Logo width={120} />
          </div>
        )}
        <div style={{ position: 'absolute', right: 16, top: 52, zIndex: 2 }}>
          <button onClick={finish} style={{ height: 44, padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: 16, color: muted }}>Пропустить</button>
        </div>

        {step === 0 && (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 128, display: 'flex', justifyContent: 'center' }}>
              <Orb size={310} />
            </div>
            <div style={{ position: 'absolute', left: 28, right: 28, top: 462 }}>
              <h1 style={{ margin: 0, fontSize: 40, lineHeight: '42px', fontWeight: 800, letterSpacing: '-0.02em' }}>Читай<br />быстрее</h1>
              <p style={{ margin: '16px 0 0', fontSize: 17, lineHeight: '25px', color: muted }}>Слова появляются по одному в одном месте. Глазам не нужно бегать по строкам.</p>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ position: 'absolute', left: 28, right: 28, top: 178 }}>
              <h1 style={{ margin: 0, fontSize: 40, lineHeight: '42px', fontWeight: 800, letterSpacing: '-0.02em' }}>Смотри на<br />цветную букву</h1>
            </div>
            <div style={{ position: 'absolute', left: 20, right: 20, top: 307, height: 230, background: '#FFFFFF', borderRadius: 32, boxShadow: '0 1px 0 rgba(23,20,15,0.03), 0 18px 40px -24px rgba(70,45,10,0.28)', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: '38%', top: 42, width: 2, height: 22, marginLeft: -1, borderRadius: 1, background: '#FF8A3D' }} />
              <span style={{ position: 'absolute', left: '38%', bottom: 42, width: 2, height: 22, marginLeft: -1, borderRadius: 1, background: '#FF5C8E' }} />
              <Word word={DEMO[k]} base={50} left={117} right={201} fontCss="var(--serif)" gradient />
            </div>
            <div style={{ position: 'absolute', left: 28, right: 28, top: 565 }}>
              <p style={{ margin: 0, fontSize: 17, lineHeight: '25px', color: muted }}>Смотри на неё, а не на всё слово. Так слово узнаётся быстрее.</p>
            </div>
          </>
        )}

        {step === 2 && (
          <div style={{ position: 'absolute', left: 28, right: 28, top: 196 }}>
            <div className="num" style={{ fontSize: 132, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.055em', marginLeft: -6 }}>{wpm}</div>
            <div style={{ marginTop: 10, fontSize: 18, color: muted }}>слов в минуту</div>
            <div style={{ marginTop: 30, position: 'relative', height: 52, borderRadius: 26, background: '#EFEAE2' }}>
              <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 26, background: ink, width: fillW }} />
              <div aria-hidden="true" style={{ position: 'absolute', top: 6, width: 40, height: 40, marginLeft: -46, borderRadius: 20, background: '#FFFFFF', boxShadow: '0 2px 6px rgba(23,20,15,0.25)', left: fillW }} />
              <input type="range" min={150} max={600} step={10} value={wpm} onChange={(e) => setWpm(Number(e.target.value))} aria-label="Стартовая скорость, слов в минуту" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
            </div>
            <div style={{ marginTop: 36, fontSize: 32, lineHeight: '36px', fontWeight: 800, letterSpacing: '-0.02em' }}>≈ {Math.round((wpm * 60) / 250)} страниц в час</div>
            <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: '25px', color: muted }}>Обычно люди читают 200–250 слов в минуту. Выбери удобную скорость, потом её можно поменять.</p>
          </div>
        )}

        <div style={{ position: 'absolute', left: 28, bottom: 122, display: 'flex', alignItems: 'center', gap: 6 }}>
          {[0, 1, 2].map((d) => <span key={d} style={{ height: 8, borderRadius: 4, transition: 'width .3s ease, background .3s ease', width: d === step ? 30 : 8, background: d === step ? ink : '#DDD7CD' }} />)}
        </div>

        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 36 }}>
          <button onClick={() => (step < 2 ? setStep(step + 1) : finish())} style={{ width: '100%', height: 58, border: 0, borderRadius: 29, background: ink, color: '#FFFFFF', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
            {step === 1 ? 'Дальше' : 'Начать'}
            {Icon.arrow()}
          </button>
        </div>
      </div>
    </div>
  );
}
