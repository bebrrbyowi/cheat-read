import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BottomNav, Confirm, Cover, Icon, Orb, Sheet, coverTitleSize, coverTitleStyle } from '../components/ui';
import { useBooks, bookProgress, changed } from '../lib/store';
import { deleteBook, type BookMeta } from '../lib/db';
import { useSettings } from '../lib/settings';

/* Экран по макету «3 · Библиотека» и «3 · Пустая библиотека». */

type Filter = 'all' | 'reading' | 'done' | 'docs';
const muted = '#706C64';

const isDoc = (b: BookMeta) => b.format === 'TXT' || b.format === 'Текст';
const shortAuthor = (a: string) => {
  const parts = a.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return a.trim();
  return parts[0].replace(/\.$/, '')[0] + '. ' + parts[parts.length - 1];
};

export default function Library() {
  const nav = useNavigate();
  const st = useSettings();
  const [books, ready] = useBooks();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState<string | null>(null);
  const [menu, setMenu] = useState<BookMeta | null>(null);
  const [confirm, setConfirm] = useState(false);
  const press = useRef<number>(0);
  const longFired = useRef(false);

  const isDone = (b: BookMeta) => !!b.finishedAt;
  const isReading = (b: BookMeta) => !b.finishedAt && bookProgress(b) > 0;
  const pass = (f: Filter, b: BookMeta) => f === 'all' || (f === 'reading' && isReading(b)) || (f === 'done' && isDone(b)) || (f === 'docs' && isDoc(b));
  const q = (search || '').trim().toLowerCase();
  const shown = books.filter((b) => pass(filter, b)).filter((b) => !q || (b.title + ' ' + b.author).toLowerCase().includes(q));
  const current = books.find((b) => !b.finishedAt && bookProgress(b) > 0);
  const defs: [Filter, string][] = [['all', 'Все'], ['reading', 'Читаю'], ['done', 'Прочитано'], ['docs', 'Документы']];
  const titles: Record<Filter, string> = { all: 'Все тексты', reading: 'В процессе', done: 'Прочитано', docs: 'Документы' };
  const empty = ready && !books.length;

  // Удаление: долгое нажатие или правый клик по книге (в макете отдельной кнопки нет).
  const holdStart = (b: BookMeta) => { longFired.current = false; clearTimeout(press.current); press.current = window.setTimeout(() => { longFired.current = true; setMenu(b); }, 550); };
  const holdEnd = () => clearTimeout(press.current);

  return (
    <>
      <div className="screen" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ paddingLeft: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: '40px', fontWeight: 700, letterSpacing: '-0.04em' }}>Библиотека</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button aria-label="Поиск" onClick={() => setSearch(search === null ? '' : null)} style={{ width: 44, height: 44, borderRadius: 22, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(22,21,19,0.06)' }}>{Icon.search()}</button>
            <Link to="/import" aria-label="Добавить текст" style={{ width: 44, height: 44, borderRadius: 22, background: '#161513', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.plus()}</Link>
          </div>
        </div>

        {empty && (
          <div style={{ minHeight: 'calc(100dvh - 240px)', padding: '0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Orb size={230} mood="sleepy" tone="soft" />
            <h2 style={{ margin: '4px 0 0', fontSize: 28, lineHeight: '31px', fontWeight: 700, letterSpacing: '-0.04em' }}>Здесь пока пусто</h2>
            <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: '23px', color: muted }}>Добавь книгу или конспект, чтобы начать читать.</p>
            <Link to="/import" style={{ marginTop: 24, height: 54, alignSelf: 'stretch', borderRadius: 27, background: '#161513', color: '#FFFFFF', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{Icon.plus(18)}Добавить первый текст</Link>
            <div style={{ marginTop: 18, fontSize: 13, color: muted }}>Подойдут файлы TXT, EPUB и FB2 или скопированный текст</div>
          </div>
        )}

        {books.length > 0 && (
          <>
            {search !== null && (
              <input className="field" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Название или автор" aria-label="Поиск по библиотеке" style={{ marginTop: 14, height: 48 }} />
            )}
            <div role="tablist" aria-label="Фильтр" className="hscroll" style={{ marginTop: 16, gap: 8 }}>
              {defs.map(([v, l]) => (
                <button key={v} role="tab" aria-selected={filter === v} onClick={() => setFilter(v)} style={{ flex: 'none', height: 40, padding: '0 16px', borderRadius: 20, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'background .2s ease', background: filter === v ? '#161513' : '#FFFFFF', color: filter === v ? '#FFFFFF' : '#161513' }}>
                  {l}<span style={{ fontWeight: 500, opacity: 0.6 }}>{books.filter((b) => pass(v, b)).length}</span>
                </button>
              ))}
            </div>

            {current && (filter === 'all' || filter === 'reading') && !q && (
              <div style={{ marginTop: 16, background: '#FFFFFF', borderRadius: 28, padding: 14, display: 'flex', gap: 16, boxShadow: '0 12px 30px -22px rgba(22,21,19,0.3)' }}>
                <div aria-hidden="true" style={{ flex: 'none', width: 84, height: 120, borderRadius: '6px 10px 10px 6px', background: current.color, color: 'rgba(255,255,255,0.92)', padding: '10px 9px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'inset 3px 0 0 rgba(0,0,0,0.18)' }}>
                  <div lang="ru" style={{ ...coverTitleStyle, fontSize: coverTitleSize(current.title, 66, 15), lineHeight: 1.07, WebkitLineClamp: 5 }}>{current.title}</div>
                  <div style={{ fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.author ? shortAuthor(current.author) : current.format}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, color: muted }}>сейчас читаю</div>
                  <div style={{ marginTop: 4, fontSize: 19, lineHeight: '22px', fontWeight: 600, letterSpacing: '-0.02em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{current.title}</div>
                  {current.author && <div style={{ fontSize: 14, color: muted, marginTop: 2 }}>{current.author}</div>}
                  <div style={{ flex: 1 }} />
                  <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: muted }}><span>{Math.floor(bookProgress(current) * 100)}%</span><span>≈ {Math.max(1, Math.round((current.totalWords * (1 - bookProgress(current))) / st.wpm))} мин</span></div>
                  <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: '#EFECE5', overflow: 'hidden' }}><div style={{ width: bookProgress(current) * 100 + '%', height: '100%', background: '#161513' }} /></div>
                  <Link to={`/read/${current.id}`} style={{ marginTop: 10, alignSelf: 'flex-start', height: 36, padding: '0 14px 0 12px', borderRadius: 18, background: '#161513', color: '#FFFFFF', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.play(12)}Продолжить</Link>
                </div>
              </div>
            )}

            <div style={{ marginTop: 22, padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{titles[filter]}</h2>
              <span style={{ fontSize: 14, color: muted }}>по дате</span>
            </div>
            {!shown.length && <p className="small" style={{ padding: '12px 8px' }}>{q ? 'Ничего не нашлось.' : 'Пока пусто.'}</p>}

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px 12px' }}>
              {shown.map((b) => {
                const p = bookProgress(b);
                return (
                  <button
                    key={b.id}
                    aria-label={`Читать: ${b.title}`}
                    onClick={() => { if (!longFired.current) nav(`/read/${b.id}`); }}
                    onContextMenu={(e) => { e.preventDefault(); setMenu(b); }}
                    onPointerDown={() => holdStart(b)} onPointerUp={holdEnd} onPointerLeave={holdEnd} onPointerCancel={holdEnd}
                    style={{ display: 'block', minWidth: 0, textAlign: 'left', WebkitTouchCallout: 'none', userSelect: 'none' }}
                  >
                    {isDoc(b) ? (
                      <span aria-hidden="true" style={{ height: 154, borderRadius: 12, background: '#FFFFFF', padding: '12px 10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 10px 20px -16px rgba(22,21,19,0.4)', position: 'relative' }}>
                        <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 6px', borderRadius: 6, background: '#161513', color: '#FFFFFF', textTransform: 'uppercase' }}>{b.format === 'Текст' ? 'Текст' : b.format}</span>
                        <span lang="ru" style={{ marginTop: 6, fontSize: 12, lineHeight: '14px', fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere', hyphens: 'auto' }}>{b.title}</span>
                        {['92%', '78%', '86%', '54%'].map((w) => <span key={w} style={{ flex: 'none', height: 3, borderRadius: 2, background: '#EFECE5', width: w }} />)}
                      </span>
                    ) : (
                      <span aria-hidden="true" style={{ height: 154, borderRadius: '6px 12px 12px 6px', padding: '12px 10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'inset 3px 0 0 rgba(0,0,0,0.14), 0 10px 20px -14px rgba(22,21,19,0.45)', background: b.color, color: 'rgba(255,255,255,0.92)' }}>
                        <span lang="ru" style={{ ...coverTitleStyle, fontSize: coverTitleSize(b.title, 84, 16), lineHeight: 1.12, WebkitLineClamp: 5 }}>{b.title}</span>
                        <span style={{ fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.author ? shortAuthor(b.author) : b.format}</span>
                      </span>
                    )}
                    <span style={{ display: 'block', marginTop: 8, fontSize: 13, lineHeight: '16px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</span>
                    <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.author || (isDoc(b) ? 'конспект' : ' ')}</span>
                    <span style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, height: 3, borderRadius: 2, background: '#E3DFD6', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', background: '#161513', width: p * 100 + '%' }} /></span>
                      <span className="num" style={{ fontSize: 11, color: muted }}>{b.finishedAt ? 'готово' : p === 0 ? 'новое' : Math.floor(p * 100) + '%'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <BottomNav />

      <Sheet open={!!menu && !confirm} onClose={() => setMenu(null)} label="Действия с книгой">
        {menu && (
          <div style={{ padding: '10px 6px 0' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <Cover color={menu.color} w={44} h={62} />
              <div style={{ minWidth: 0 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{menu.title}</div><div className="small">{[menu.author, menu.format].filter(Boolean).join(', ')}</div></div>
            </div>
            <button className="btn btn-dark" style={{ marginTop: 18 }} onClick={() => nav(`/read/${menu.id}`)}>{Icon.play(15)}Читать</button>
            <button className="btn-text" style={{ marginTop: 6, color: 'var(--danger)' }} onClick={() => setConfirm(true)}>Удалить из библиотеки</button>
          </div>
        )}
      </Sheet>
      <Confirm
        open={confirm}
        title="Удалить книгу?"
        text="Книга и её цитаты удалятся с этого устройства."
        okLabel="Удалить"
        danger
        onCancel={() => setConfirm(false)}
        onOk={async () => { if (menu) await deleteBook(menu.id); changed(); setConfirm(false); setMenu(null); }}
      />
    </>
  );
}
