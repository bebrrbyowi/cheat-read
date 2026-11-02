import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BottomNav, Cover, Icon, Logo, Orb, Sheet } from '../components/ui';
import { ArcDial } from '../components/ArcDial';
import { useBooks, useQuotes, useStatsData, bookProgress } from '../lib/store';
import { useSettings } from '../lib/settings';
import { summarize } from '../lib/stats';
import { greeting, plural } from '../lib/format';

export default function Home() {
  const nav = useNavigate();
  const st = useSettings();
  const [books, ready] = useBooks();
  const [quotes] = useQuotes();
  const [{ days, sessions }] = useStatsData();
  const sum = summarize(days, sessions);
  const [min, setMin] = useState(10);
  const [pick, setPick] = useState(false);
  const [pickId, setPickId] = useState<string | null>(null);

  const current = books.find((b) => !b.finishedAt) || books[0];
  const recent = books.filter((b) => b.id !== current?.id).slice(0, 8);
  const end = new Date(Date.now() + min * 60000);
  const todayMin = Math.round(sum.todaySeconds / 60);
  const name = st.name.trim();

  return (
    <>
      <div className="screen">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8 }}>
          <Logo width={112} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/import" className="icon-btn" aria-label="Добавить книгу">{Icon.plus()}</Link>
            <Link to="/profile" className="icon-btn dark" aria-label="Профиль" style={{ fontSize: 16, fontWeight: 600 }}>{name ? name[0].toUpperCase() : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>}</Link>
          </div>
        </div>

        <h1 className="h1" style={{ padding: '26px 8px 0', fontSize: 36 }}>
          {greeting()}{name ? <>,<br />{name}</> : ''}
        </h1>

        {ready && !books.length && (
          <div className="card empty" style={{ marginTop: 22, padding: '8px 20px 20px', borderRadius: 32 }}>
            <Orb size={190} mood="sleepy" tone="soft" />
            <div className="h2" style={{ fontSize: 24 }}>Добавь первую книгу</div>
            <p className="small" style={{ margin: '8px 0 0', fontSize: 15, lineHeight: '22px' }}>Загрузи файл TXT, EPUB или FB2 или вставь скопированный текст.</p>
            <Link to="/import" className="btn btn-dark" style={{ marginTop: 18, height: 54 }}>{Icon.plus(18)}Добавить книгу</Link>
          </div>
        )}

        {current && (
          <>
            <Link to={`/read/${current.id}`} aria-label={`Продолжить: ${current.title}`} style={{ display: 'block', marginTop: 22, borderRadius: 32, background: '#FFE7E3', position: 'relative', overflow: 'hidden', height: 290 }}>
              <div style={{ position: 'absolute', left: '50%', top: 14, marginLeft: -150 }}><Orb size={300} /></div>
              <div style={{ position: 'relative', background: '#fff', borderRadius: 32, padding: 20, boxShadow: '0 10px 30px -18px rgba(120,60,10,0.35)' }}>
                <div style={{ fontSize: 30, lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.02em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{current.title}</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, gap: 10 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.author}</span>
                  <span className="num" style={{ color: 'var(--muted)', flex: 'none' }}><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{Math.floor(bookProgress(current) * 100)}%</b> / {Math.max(1, Math.round((current.totalWords * (1 - bookProgress(current))) / st.wpm))} мин</span>
                </div>
                <div style={{ marginTop: 14, height: 4, borderRadius: 2, background: '#EFECE5', overflow: 'hidden' }}><div style={{ width: bookProgress(current) * 100 + '%', height: '100%', background: 'var(--ink)' }} /></div>
              </div>
              <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'flex', justifyContent: 'center' }}>
                <span style={{ height: 48, padding: '0 22px 0 18px', borderRadius: 24, background: 'var(--ink)', color: '#fff', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>{Icon.play()}Продолжить чтение</span>
              </div>
            </Link>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Link to="/stats" className="card" style={{ borderRadius: 24, padding: '16px 18px' }}>
                <div className="meta">сегодня</div>
                <div className="num" style={{ marginTop: 8, fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>{todayMin}<span style={{ fontSize: 15, fontWeight: 500, color: 'var(--muted)', letterSpacing: 0 }}> / {st.goal} мин</span></div>
                <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: '#EFECE5', overflow: 'hidden' }}><div style={{ width: Math.min(100, (todayMin / st.goal) * 100) + '%', height: '100%', background: 'var(--grad)' }} /></div>
              </Link>
              <Link to="/stats" className="card" style={{ borderRadius: 24, padding: '16px 18px' }}>
                <div className="meta">серия</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap', lineHeight: 1 }}><span className="num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em' }}>{sum.streak}</span><span style={{ fontSize: 15, fontWeight: 500, color: 'var(--muted)' }}>{plural(sum.streak, 'день', 'дня', 'дней')}</span></div>
                <div aria-hidden="true" style={{ marginTop: 10, display: 'flex', gap: 5 }}>
                  {sum.week.map((d) => <span key={d.label} style={{ flex: 1, height: 8, borderRadius: 4, background: d.seconds >= 60 ? (d.isToday ? 'var(--grad)' : 'var(--ink)') : '#E3DFD6' }} />)}
                </div>
              </Link>
            </div>

            {recent.length > 0 && (
              <>
                <div className="row-head"><h2 className="h3">Недавние</h2><Link to="/library" className="small">Все</Link></div>
                <div className="hscroll">
                  {recent.map((b) => (
                    <Link key={b.id} to={`/read/${b.id}`} className="card" style={{ flex: 'none', width: 214, display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 20 }}>
                      <Cover color={b.color} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</span>
                        <span className="meta" style={{ display: 'block', marginTop: 2, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.author || b.format}</span>
                        <span style={{ display: 'block', marginTop: 8, height: 3, borderRadius: 2, background: '#EFECE5', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: bookProgress(b) * 100 + '%', background: 'var(--ink)' }} /></span>
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <Link to="/test" className="card" style={{ marginTop: 16, display: 'block', position: 'relative', overflow: 'hidden', padding: 18 }}>
          <div style={{ position: 'absolute', right: -22, top: -6 }}><Orb size={132} /></div>
          <div style={{ position: 'relative', maxWidth: 220 }}>
            <div style={{ fontSize: 22, lineHeight: '25px', fontWeight: 800, letterSpacing: '-0.02em' }}>Проверь свой темп</div>
            <div className="small" style={{ marginTop: 6, lineHeight: '20px' }}>Прочитай два отрывка и ответь на вопросы. Узнаешь, какая скорость тебе подходит.</div>
          </div>
          <span style={{ position: 'relative', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="btn-sm btn-dark">Пройти тест{Icon.arrow(16)}</span>
            <span style={{ fontSize: 13, color: 'var(--faint)' }}>≈ 2 минуты</span>
          </span>
        </Link>

        {books.length > 0 && (
          <div className="card" style={{ marginTop: 16, borderRadius: 32, padding: '20px 18px 18px' }}>
            <div className="h3" style={{ fontSize: 20, fontWeight: 800 }}>Быстрая сессия</div>
            <div style={{ position: 'relative', margin: '4px -10px 0' }}>
              <ArcDial value={min} onChange={setMin} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', textAlign: 'center', pointerEvents: 'none' }}>
                <div className="num" style={{ fontSize: 58, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.04em' }}>{min}<span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}> мин</span></div>
                <div className="meta num" style={{ marginTop: 6 }}>до {String(end.getHours()).padStart(2, '0')}:{String(end.getMinutes()).padStart(2, '0')}</div>
              </div>
            </div>
            <button className="btn btn-dark" style={{ marginTop: 14, fontSize: 17 }} onClick={() => { setPickId(current?.id || null); setPick(true); }}>Начать</button>
          </div>
        )}

        {quotes.length > 0 && (
          <>
            <div className="row-head"><h2 className="h3">Твои цитаты</h2></div>
            <div className="hscroll">
              {quotes.slice(0, 8).map((q) => (
                <Link key={q.id} to="/quotes" className="card" style={{ flex: 'none', width: 264, minHeight: 178, borderRadius: 24, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
                  <span aria-hidden="true" style={{ fontFamily: 'var(--serif)', fontSize: 44, lineHeight: '30px', height: 26, background: 'linear-gradient(180deg, #FF8A3D, #FF5C8E)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>“</span>
                  <span style={{ marginTop: 8, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, lineHeight: '23px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{q.text}</span>
                  <span className="meta" style={{ marginTop: 'auto', paddingTop: 12, fontSize: 12 }}>{q.bookTitle}{q.author ? ', ' + q.author : ''}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />

      <Sheet open={pick} onClose={() => setPick(false)} label="Выбор книги для сессии">
        <div style={{ padding: '10px 6px 0' }}>
          <div className="meta">быстрая сессия, {min} мин</div>
          <h2 className="h2" style={{ marginTop: 4, fontSize: 26, lineHeight: '29px' }}>Что читаем?</h2>
          <p className="small" style={{ margin: '6px 0 0', lineHeight: '20px' }}>Когда время закончится, чтение остановится. Место в книге сохранится.</p>
        </div>
        <div className="card" style={{ marginTop: 12, borderRadius: 24, padding: '2px 14px', maxHeight: 320, overflowY: 'auto' }}>
          {books.map((b, k) => {
            const on = b.id === pickId;
            return (
              <button key={b.id} aria-pressed={on} onClick={() => setPickId(b.id)} style={{ width: '100%', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', borderBottom: k === books.length - 1 ? 0 : '1px solid #F3EFE9' }}>
                <Cover color={b.color} w={34} h={48} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</span>
                  <span className="meta" style={{ display: 'block', marginTop: 2 }}>{[b.author, b.finishedAt ? 'прочитано, начать заново' : Math.floor(bookProgress(b) * 100) + '%'].filter(Boolean).join(', ')}</span>
                </span>
                <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${on ? 'var(--ink)' : '#C9C2B7'}`, background: on ? 'var(--ink)' : 'transparent', color: '#fff' }}>{on && Icon.check(13)}</span>
              </button>
            );
          })}
        </div>
        <button className="btn btn-dark" style={{ marginTop: 14 }} disabled={!pickId} onClick={() => pickId && nav(`/read/${pickId}?session=${min}`)}>{Icon.play(15)}Начать на {min} мин</button>
      </Sheet>
    </>
  );
}
