import { useState } from 'react';
import { BottomNav, Cover, Orb } from '../components/ui';
import { useStatsData } from '../lib/store';
import { summarize } from '../lib/stats';
import { minutesLabel, num, plural, relDate, shortNum } from '../lib/format';

export default function Stats() {
  const [{ days, sessions }, ready] = useStatsData();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [pick, setPick] = useState<number | null>(null);
  const s = summarize(days, sessions);
  const todayIdx = s.week.findIndex((d) => d.isToday);
  const sel = pick ?? (period === 'week' ? todayIdx : 3);
  const bars = period === 'week' ? s.week.map((d, k) => ({ label: d.label, sec: d.seconds, on: k === sel })) : s.month.map((d, k) => ({ label: d.label, sec: d.seconds, on: k === sel }));
  const fmtBar = (sec: number) => { const m = Math.round(sec / 60); return m >= 60 ? Math.floor(m / 60) + 'ч ' + (m % 60) : m + 'м'; };
  const prev = period === 'week' ? s.prevWeekSeconds : s.prevMonthSeconds;
  const cur = period === 'week' ? s.weekSeconds : s.monthSeconds;
  const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  const monthName = new Date().toLocaleDateString('ru-RU', { month: 'long' });
  const max = Math.max(60, ...bars.map((b) => b.sec));
  const total = period === 'week' ? s.weekSeconds : s.monthSeconds;
  const words = period === 'week' ? s.weekWords : s.monthWords;
  const empty = ready && !sessions.length;
  const lo = 150, hi = 700;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

  return (
    <>
      <div className="screen">
        <h1 style={{ margin: 0, paddingLeft: 8, fontSize: 36, lineHeight: '40px', fontWeight: 700, letterSpacing: '-0.04em' }}>Прогресс</h1>
        {!empty && (
          <div role="tablist" aria-label="Период" style={{ marginTop: 16, display: 'flex', padding: 4, borderRadius: 22, background: '#EFECE5' }}>
            {([['week', 'Неделя'], ['month', 'Месяц']] as const).map(([v, l]) => (
              <button key={v} role="tab" aria-selected={period === v} onClick={() => { setPeriod(v); setPick(null); }} style={{ flex: 1, height: 36, padding: '0 14px', borderRadius: 18, fontSize: 14, fontWeight: 600, transition: 'background .2s ease', background: period === v ? '#FFFFFF' : 'transparent', boxShadow: period === v ? '0 1px 3px rgba(22,21,19,0.1)' : 'none' }}>{l}</button>
            ))}
          </div>
        )}

        {empty ? (
          <div className="empty" style={{ minHeight: 'calc(100dvh - 260px)', justifyContent: 'center', padding: '0 16px' }}>
            <Orb size={210} mood="sleepy" tone="soft" />
            <h2 className="h1" style={{ fontSize: 28, lineHeight: '31px' }}>Пока нечего считать</h2>
            <p className="body" style={{ marginTop: 10, fontSize: 16 }}>Почитай пару минут, и здесь появятся время, слова и серия.</p>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginTop: 18, padding: '18px 18px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, color: '#706C64' }}>время чтения, {period === 'week' ? 'эта неделя' : monthName}</span>
                {delta !== null && delta !== 0 && <span className="num" style={{ fontSize: 13, fontWeight: 600, color: '#8A3D06', background: '#FCE8D2', padding: '3px 8px', borderRadius: 10 }}>{delta > 0 ? '+' : '−'}{Math.abs(delta)}%</span>}
              </div>
              <div className="num" style={{ marginTop: 6, fontSize: 44, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.045em' }}>{minutesLabel(total)}</div>
              <div style={{ marginTop: 16, height: 150, display: 'grid', gap: 8, alignItems: 'end', gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
                {bars.map((b, k) => (
                  <button key={b.label} onClick={() => setPick(k)} aria-pressed={b.on} aria-label={`${b.label}: ${Math.round(b.sec / 60)} минут`} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'stretch', gap: 6 }}>
                    <span className="num" style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: '#161513', opacity: b.on ? 1 : 0 }}>{fmtBar(b.sec)}</span>
                    <span style={{ display: 'block', borderRadius: 12, boxSizing: 'border-box', transition: 'height .35s ease, background .2s ease', height: Math.max(8, Math.round((b.sec / max) * 112)), background: b.on ? '#161513' : 'repeating-linear-gradient(135deg, #CFC9BE 0 1.5px, transparent 1.5px 6px)', border: `1.5px solid ${b.on ? '#161513' : '#CFC9BE'}` }} />
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'grid', gap: 8, gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
                {bars.map((b) => <span key={b.label} style={{ fontSize: 12, textAlign: 'center', color: '#706C64' }}>{b.label}</span>)}
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card" style={{ borderRadius: 24, padding: '16px 18px' }}>
                <div className="meta">слов прочитано</div>
                <div className="num" style={{ marginTop: 8, fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em' }}>{shortNum(words)}</div>
              </div>
              <div className="card" style={{ borderRadius: 24, padding: '16px 18px' }}>
                <div className="meta">средний темп</div>
                <div className="num" style={{ marginTop: 8, fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em' }}>{s.avgWpm || '—'}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', letterSpacing: 0 }}> сл/мин</span></div>
              </div>
            </div>

            <div style={{ marginTop: 12, background: '#161513', color: '#fff', borderRadius: 24, padding: '18px 20px 20px' }}>
              <div style={{ fontSize: 13, color: '#B5B0A7' }}>серия</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="num" style={{ fontSize: 34, lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.04em' }}>{s.streak}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#B5B0A7' }}>{plural(s.streak, 'день', 'дня', 'дней')} подряд</span>
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, textAlign: 'center' }}>
                {s.week.map((d) => (
                  <div key={d.label}>
                    <span style={{ display: 'block', height: 8, borderRadius: 4, background: d.seconds >= 60 ? (d.isToday ? 'var(--grad)' : '#fff') : '#3A3530' }} />
                    <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: d.isToday ? '#fff' : '#8E887E', fontWeight: d.isToday ? 600 : 400 }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {s.avgWpm > 0 && s.usualHigh > 0 && (
              <div className="card" style={{ marginTop: 12, padding: 18 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Твоя обычная скорость</div>
                <p className="small" style={{ margin: '6px 0 0', lineHeight: '20px' }}>На этой скорости ты обычно дочитываешь главы до конца.</p>
                <div style={{ marginTop: 26, position: 'relative', height: 12, borderRadius: 6, background: '#EFECE5' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: pos(s.usualLow) + '%', width: Math.max(2, pos(s.usualHigh) - pos(s.usualLow)) + '%', borderRadius: 6, background: '#FFB45A' }} />
                  <div className="num" style={{ position: 'absolute', top: -22, left: pos(s.avgWpm) + '%', transform: 'translateX(-50%)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>сейчас {s.avgWpm}</div>
                  <div style={{ position: 'absolute', top: -4, left: pos(s.avgWpm) + '%', width: 3, height: 20, marginLeft: -1.5, borderRadius: 2, background: '#161513' }} />
                </div>
                <div className="meta num" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{lo}</span><span>обычно {s.usualLow}–{s.usualHigh}</span><span>{hi}</span></div>
              </div>
            )}

            <div style={{ marginTop: 22, padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Последние сессии</h2>
              <span style={{ fontSize: 14, color: '#706C64' }}>{Math.min(8, sessions.length)} из {sessions.length}</span>
            </div>
            <div className="card" style={{ marginTop: 10, borderRadius: 24, padding: '4px 16px' }}>
              {sessions.slice(0, 8).map((x, k, a) => (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: k === a.length - 1 ? 0 : '1px solid #EFECE5' }}>
                  <Cover color={x.color} w={36} h={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.bookTitle}</div>
                    <div className="meta" style={{ marginTop: 2 }}>{relDate(x.start)}</div>
                  </div>
                  <div className="num" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{minutesLabel(x.seconds)}</div>
                    <div className="meta" style={{ marginTop: 2 }}>{x.seconds >= 30 ? Math.round(x.words / (x.seconds / 60)) + ' сл/мин' : num(x.words) + ' слов'}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </>
  );
}
