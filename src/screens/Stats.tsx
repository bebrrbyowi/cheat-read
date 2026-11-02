import { useState } from 'react';
import { BottomNav, Cover, Orb, Segmented } from '../components/ui';
import { useStatsData } from '../lib/store';
import { summarize } from '../lib/stats';
import { minutesLabel, num, plural, relDate, shortNum } from '../lib/format';

export default function Stats() {
  const [{ days, sessions }, ready] = useStatsData();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const s = summarize(days, sessions);
  const bars = period === 'week' ? s.week.map((d) => ({ label: d.label, sec: d.seconds, on: d.isToday })) : s.month.map((d, k) => ({ label: d.label, sec: d.seconds, on: k === 3 }));
  const max = Math.max(60, ...bars.map((b) => b.sec));
  const total = period === 'week' ? s.weekSeconds : s.monthSeconds;
  const words = period === 'week' ? s.weekWords : s.monthWords;
  const empty = ready && !sessions.length;
  const lo = 150, hi = 700;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

  return (
    <>
      <div className="screen">
        <h1 className="h1" style={{ fontSize: 36, paddingLeft: 8 }}>Прогресс</h1>
        {!empty && <Segmented label="Период" value={period} onChange={setPeriod} options={[{ value: 'week', label: 'Неделя' }, { value: 'month', label: 'Месяц' }]} style={{ marginTop: 16 }} />}

        {empty ? (
          <div className="empty" style={{ minHeight: 'calc(100dvh - 260px)', justifyContent: 'center', padding: '0 16px' }}>
            <Orb size={210} mood="sleepy" tone="soft" />
            <h2 className="h1" style={{ fontSize: 28, lineHeight: '31px' }}>Пока нечего считать</h2>
            <p className="body" style={{ marginTop: 10, fontSize: 16 }}>Почитай пару минут, и здесь появятся время, слова и серия.</p>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginTop: 18, padding: '18px 18px 14px' }}>
              <div className="small">время чтения, {period === 'week' ? 'эта неделя' : '4 недели'}</div>
              <div className="num" style={{ marginTop: 6, fontSize: 44, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.045em' }}>{minutesLabel(total)}</div>
              <div style={{ marginTop: 16, height: 150, display: 'grid', gap: 8, alignItems: 'end', gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
                {bars.map((b) => (
                  <div key={b.label} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }} aria-label={`${b.label}: ${Math.round(b.sec / 60)} мин`}>
                    <span className="num" style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', opacity: b.on ? 1 : 0 }}>{Math.round(b.sec / 60)}м</span>
                    <span style={{ display: 'block', borderRadius: 12, height: Math.max(8, (b.sec / max) * 112), background: b.on ? '#17140F' : 'repeating-linear-gradient(135deg, #CFC9BE 0 1.5px, transparent 1.5px 6px)', border: `1.5px solid ${b.on ? '#17140F' : '#CFC9BE'}` }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'grid', gap: 8, gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
                {bars.map((b) => <span key={b.label} className="meta" style={{ fontSize: period === 'week' ? 12 : 11, textAlign: 'center' }}>{b.label}</span>)}
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
                <p className="small" style={{ margin: '6px 0 0', lineHeight: '20px' }}>На этой скорости ты обычно читаешь.</p>
                <div style={{ marginTop: 26, position: 'relative', height: 12, borderRadius: 6, background: '#EFECE5' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: pos(s.usualLow) + '%', width: Math.max(2, pos(s.usualHigh) - pos(s.usualLow)) + '%', borderRadius: 6, background: '#FFB45A' }} />
                  <div className="num" style={{ position: 'absolute', top: -22, left: pos(s.avgWpm) + '%', transform: 'translateX(-50%)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>сейчас {s.avgWpm}</div>
                  <div style={{ position: 'absolute', top: -4, left: pos(s.avgWpm) + '%', width: 3, height: 20, marginLeft: -1.5, borderRadius: 2, background: '#161513' }} />
                </div>
                <div className="meta num" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{lo}</span><span>обычно {s.usualLow}–{s.usualHigh}</span><span>{hi}</span></div>
              </div>
            )}

            <div className="row-head"><h2 className="h3">Последние сессии</h2></div>
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
                    <div className="meta" style={{ marginTop: 2 }}>{num(x.words)} слов</div>
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
