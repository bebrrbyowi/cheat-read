import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Confirm, Cover, Icon, Orb, Sheet, useToast } from '../components/ui';
import { useBooks, useQuotes, changed } from '../lib/store';
import { deleteQuote, updateBook } from '../lib/db';
import { relDate, plural } from '../lib/format';

export default function Quotes() {
  const nav = useNavigate();
  const [quotes] = useQuotes();
  const [books] = useBooks();
  const [query, setQuery] = useState('');
  const [book, setBook] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [bq, setBq] = useState('');
  const [toast, showToast] = useToast();
  const [del, setDel] = useState<string | null>(null);
  const press = useRef(0);
  // Удаление цитаты: долгое нажатие или правый клик по карточке (в макете отдельной кнопки нет).
  const hold = (id: string) => ({
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setDel(id); },
    onPointerDown: () => { clearTimeout(press.current); press.current = window.setTimeout(() => setDel(id), 600); },
    onPointerUp: () => clearTimeout(press.current),
    onPointerLeave: () => clearTimeout(press.current),
    onPointerCancel: () => clearTimeout(press.current),
  });

  const q = query.trim().toLowerCase();
  const items = quotes
    .filter((x) => !book || x.bookId === book)
    .filter((x) => !q || x.text.toLowerCase().includes(q) || x.bookTitle.toLowerCase().includes(q));
  const withQuotes = Array.from(new Map(quotes.map((x) => [x.bookId, x])).values());
  const bookName = withQuotes.find((x) => x.bookId === book)?.bookTitle;

  const share = async (text: string, src: string) => {
    const msg = `«${text}»\n${src}`;
    try {
      if (navigator.share) await navigator.share({ text: msg });
      else { await navigator.clipboard.writeText(msg); showToast('Цитата скопирована'); }
    } catch { /* пользователь закрыл окно */ }
  };

  return (
    <div className="screen no-nav">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="icon-btn" aria-label="Назад" onClick={() => nav(-1)}>{Icon.back()}</button>
        <span className="small num">{quotes.length} {plural(quotes.length, 'цитата', 'цитаты', 'цитат')}</span>
      </div>
      <h1 style={{ margin: '18px 8px 0', fontSize: 36, lineHeight: '40px', fontWeight: 800, letterSpacing: '-0.02em' }}>Цитаты</h1>

      {quotes.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, minWidth: 0, height: 48, borderRadius: 24, background: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', boxShadow: '0 1px 3px rgba(23,20,15,0.06)' }}>
            <span style={{ color: '#8A837A' }}>{Icon.search(18)}</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Слово, фраза или книга" aria-label="Поиск по цитатам" style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: 16 }} />
          </label>
          <button aria-label="Фильтр по книге" onClick={() => { setBq(''); setSheet(true); }} className="icon-btn" style={{ width: 48, height: 48, borderRadius: 24, background: book ? 'var(--ink)' : '#fff', color: book ? '#fff' : 'var(--ink)' }}>{Icon.sliders()}</button>
        </div>
      )}
      {book && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
          <span className="small">Книга:</span>
          <button onClick={() => setBook(null)} className="chip on" style={{ height: 34, paddingRight: 8, maxWidth: 280 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bookName}</span>{Icon.close(14)}
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((x) => {
          const src = x.bookTitle + (x.author ? ', ' + x.author : '');
          const exists = books.some((b) => b.id === x.bookId);
          return (
            <figure key={x.id} {...hold(x.id)} style={{ margin: 0, borderRadius: 26, background: '#FFFFFF', padding: '16px 18px 12px', boxShadow: '0 1px 0 rgba(23,20,15,0.02)', WebkitTouchCallout: 'none' }}>
              <span aria-hidden="true" style={{ display: 'block', fontFamily: 'var(--serif)', fontSize: 44, lineHeight: '30px', height: 24, background: 'linear-gradient(180deg, #FF8A3D, #FF5C8E)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>“</span>
              <blockquote style={{ margin: '8px 0 0', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, lineHeight: '27px' }}>{x.text}</blockquote>
              <figcaption className="meta" style={{ marginTop: 12 }}><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{x.bookTitle}</b>{x.author ? ', ' + x.author : ''}</figcaption>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #F3EFE9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#8A837A' }}>{relDate(x.createdAt)}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {exists && <button className="chip" style={{ height: 36, background: 'var(--chip)', fontSize: 13 }} onClick={async () => { await updateBook(x.bookId, { pos: { ch: x.ch, w: 0 } }); changed(); nav(`/read/${x.bookId}`); }}>{Icon.book()}В книге</button>}
                  <button aria-label="Поделиться цитатой" className="chip" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center', background: 'var(--chip)' }} onClick={() => share(x.text, src)}>{Icon.share()}</button>
                </div>
              </div>
            </figure>
          );
        })}
      </div>

      {!items.length && (
        <div className="empty" style={{ marginTop: 24 }}>
          <Orb size={140} mood="sleepy" tone="soft" />
          <div style={{ fontSize: 18, fontWeight: 700 }}>{quotes.length ? 'Ничего не нашлось' : 'Пока нет цитат'}</div>
          <p className="small" style={{ marginTop: 6, lineHeight: '20px', maxWidth: 270 }}>Чтобы сохранить цитату, поставь чтение на паузу, разверни текст и нажми «Цитата».</p>
        </div>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} label="Выбор книги">
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Цитаты из книги</h2>
          <button onClick={() => setSheet(false)} style={{ height: 36, padding: '0 14px', borderRadius: 18, background: '#F3EFE9', fontSize: 14, fontWeight: 600 }}>Готово</button>
        </div>
        <label style={{ marginTop: 14, height: 44, borderRadius: 22, background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', boxShadow: '0 1px 3px rgba(23,20,15,0.06)' }}>
          <span style={{ color: '#8A837A' }}>{Icon.search(16)}</span>
          <input type="search" value={bq} onChange={(e) => setBq(e.target.value)} placeholder="Название или автор" aria-label="Поиск книги" style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: 15 }} />
        </label>
        <div style={{ marginTop: 8 }}>
          {[{ bookId: null as string | null, bookTitle: 'Все книги', author: '' }, ...withQuotes]
            .filter((x) => !bq.trim() || x.bookId === null || (x.bookTitle + ' ' + x.author).toLowerCase().includes(bq.trim().toLowerCase()))
            .map((x) => {
              const n = x.bookId ? quotes.filter((y) => y.bookId === x.bookId).length : quotes.length;
              const on = book === x.bookId;
              const color = books.find((b) => b.id === x.bookId)?.color || 'var(--grad)';
              return (
                <button key={x.bookId || 'all'} onClick={() => { setBook(x.bookId); setSheet(false); }} style={{ width: '100%', padding: '12px 6px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', borderBottom: '1px solid #F0ECE5' }}>
                  <Cover color={color} w={32} h={44} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.bookTitle}</span>
                    <span className="meta" style={{ display: 'block', marginTop: 2 }}>{[x.author, n + ' ' + plural(n, 'цитата', 'цитаты', 'цитат')].filter(Boolean).join(', ')}</span>
                  </span>
                  <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${on ? 'var(--ink)' : '#C9C2B7'}`, background: on ? 'var(--ink)' : 'transparent', color: '#fff' }}>{on && Icon.check(13)}</span>
                </button>
              );
            })}
        </div>
      </Sheet>
      {toast && <div className="toast" role="status">{toast}</div>}
      <Confirm open={!!del} title="Удалить цитату?" text="Цитата пропадёт из списка." okLabel="Удалить" danger onCancel={() => setDel(null)} onOk={async () => { if (del) await deleteQuote(del); changed(); setDel(null); }} />
    </div>
  );
}
