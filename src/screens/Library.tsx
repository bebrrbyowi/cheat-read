import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BottomNav, Confirm, Cover, Icon, Orb, Sheet, coverTitleSize, coverTitleStyle } from '../components/ui';
import { useBooks, bookProgress, changed } from '../lib/store';
import { deleteBook, type BookMeta } from '../lib/db';
import { useSettings } from '../lib/settings';

type Filter = 'all' | 'reading' | 'done';

export default function Library() {
  const nav = useNavigate();
  const st = useSettings();
  const [books, ready] = useBooks();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState<string | null>(null);
  const [menu, setMenu] = useState<BookMeta | null>(null);
  const [confirm, setConfirm] = useState(false);

  const isDone = (b: BookMeta) => !!b.finishedAt;
  const isReading = (b: BookMeta) => !b.finishedAt && bookProgress(b) > 0;
  const q = (search || '').trim().toLowerCase();
  const shown = books
    .filter((b) => filter === 'all' || (filter === 'done' ? isDone(b) : isReading(b)))
    .filter((b) => !q || (b.title + ' ' + b.author).toLowerCase().includes(q));
  const current = books.find((b) => !b.finishedAt && bookProgress(b) > 0);
  const counts = { all: books.length, reading: books.filter(isReading).length, done: books.filter(isDone).length };

  return (
    <>
      <div className="screen">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8 }}>
          <h1 className="h1" style={{ fontSize: 36 }}>Библиотека</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {books.length > 0 && <button className="icon-btn" aria-label="Поиск" onClick={() => setSearch(search === null ? '' : null)}>{Icon.search()}</button>}
            <Link to="/import" className="icon-btn dark" aria-label="Добавить книгу">{Icon.plus()}</Link>
          </div>
        </div>

        {ready && !books.length && (
          <div className="empty" style={{ minHeight: 'calc(100dvh - 260px)', justifyContent: 'center', padding: '0 16px' }}>
            <Orb size={230} mood="sleepy" tone="soft" />
            <h2 className="h1" style={{ fontSize: 28, lineHeight: '31px' }}>Здесь пока пусто</h2>
            <p className="body" style={{ marginTop: 10, fontSize: 16, lineHeight: '23px' }}>Добавь книгу или конспект, чтобы начать читать.</p>
            <Link to="/import" className="btn btn-dark" style={{ marginTop: 24, height: 54 }}>{Icon.plus(18)}Добавить первый текст</Link>
            <div className="meta" style={{ marginTop: 18 }}>Подойдут файлы TXT, EPUB и FB2 или скопированный текст</div>
          </div>
        )}

        {books.length > 0 && (
          <>
            {search !== null && (
              <input className="field" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Название или автор" aria-label="Поиск по библиотеке" style={{ marginTop: 14, height: 48 }} />
            )}
            <div role="tablist" aria-label="Фильтр" className="hscroll" style={{ marginTop: 14 }}>
              {([['all', 'Все'], ['reading', 'Читаю'], ['done', 'Прочитано']] as const).map(([v, l]) => (
                <button key={v} role="tab" aria-selected={filter === v} className={'chip' + (filter === v ? ' on' : '')} style={{ height: 40, fontSize: 15, padding: '0 16px' }} onClick={() => setFilter(v)}>
                  {l}<span style={{ opacity: 0.55, fontWeight: 500 }}>{counts[v]}</span>
                </button>
              ))}
            </div>

            {current && filter !== 'done' && !q && (
              <div className="card" style={{ marginTop: 14, padding: 14, display: 'flex', gap: 16, boxShadow: '0 12px 30px -22px rgba(22,21,19,0.3)' }}>
                <Cover color={current.color} w={84} h={120} title={current.title} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div className="meta">сейчас читаю</div>
                  <div style={{ marginTop: 4, fontSize: 19, lineHeight: '22px', fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{current.title}</div>
                  <div className="small" style={{ marginTop: 2 }}>{current.author}</div>
                  <div style={{ flex: 1 }} />
                  <div className="meta num" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{Math.floor(bookProgress(current) * 100)}%</span><span>≈ {Math.max(1, Math.round((current.totalWords * (1 - bookProgress(current))) / st.wpm))} мин</span></div>
                  <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: '#EFECE5', overflow: 'hidden' }}><div style={{ width: bookProgress(current) * 100 + '%', height: '100%', background: 'var(--ink)' }} /></div>
                  <Link to={`/read/${current.id}`} className="btn-sm btn-dark" style={{ marginTop: 10, alignSelf: 'flex-start', height: 36, padding: '0 14px 0 12px', fontSize: 14 }}>{Icon.play(12)}Продолжить</Link>
                </div>
              </div>
            )}

            <div className="row-head"><h2 className="h3">{filter === 'all' ? 'Все книги' : filter === 'done' ? 'Прочитано' : 'В процессе'}</h2></div>
            {!shown.length && <p className="small" style={{ padding: '12px 8px' }}>{q ? 'Ничего не нашлось.' : 'Пока пусто.'}</p>}
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px 12px' }}>
              {shown.map((b) => {
                const p = bookProgress(b);
                return (
                  <div key={b.id} style={{ minWidth: 0, position: 'relative' }}>
                    <button onClick={() => nav(`/read/${b.id}`)} style={{ display: 'block', width: '100%', textAlign: 'left' }} aria-label={`Читать: ${b.title}`}>
                      <span className="cover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 154, padding: '12px 10px', background: b.color, color: 'rgba(255,255,255,0.9)', boxShadow: 'inset 3px 0 0 rgba(0,0,0,0.14), 0 10px 20px -14px rgba(22,21,19,0.45)' }}>
                        <span lang="ru" style={{ ...coverTitleStyle, fontSize: coverTitleSize(b.title, 84, 15), WebkitLineClamp: 5 }}>{b.title}</span>
                        <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75 }}>{b.format}</span>
                      </span>
                      <span style={{ display: 'block', marginTop: 8, fontSize: 13, lineHeight: '16px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</span>
                      <span className="meta" style={{ display: 'block', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.author || ' '}</span>
                    </button>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, height: 3, borderRadius: 2, background: '#E3DFD6', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: p * 100 + '%', background: 'var(--ink)' }} /></span>
                      <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>{b.finishedAt ? 'готово' : p === 0 ? 'новое' : Math.floor(p * 100) + '%'}</span>
                      <button aria-label={`Ещё: ${b.title}`} onClick={() => setMenu(b)} style={{ width: 28, height: 28, marginRight: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>{Icon.dots(16)}</button>
                    </div>
                  </div>
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
