import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Orb, coverTitleSize, coverTitleStyle } from '../components/ui';
import { relDate } from '../lib/format';
import { parseFile, parsePasted, coverColor, ImportError, type ParsedBook } from '../lib/importers';
import { saveBook, uid, type BookMeta } from '../lib/db';
import { countWords } from '../lib/text';
import { changed, useBooks } from '../lib/store';

type Stage = 'pick' | 'paste' | 'loading' | 'done' | 'error';

async function store(p: ParsedBook): Promise<BookMeta> {
  const id = uid();
  const chapterWords = p.chapters.map((c) => countWords(c.text));
  const meta: BookMeta = {
    id, title: p.title, author: p.author, format: p.format, color: coverColor(p.title + p.author),
    addedAt: Date.now(), openedAt: Date.now(), chapterTitles: p.chapters.map((c) => c.title), chapterWords,
    totalWords: chapterWords.reduce((a, b) => a + b, 0), pos: { ch: 0, w: 0 },
  };
  await saveBook(meta, { id, chapters: p.chapters });
  changed();
  return meta;
}

export default function Import() {
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState('');
  const [book, setBook] = useState<BookMeta | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [books] = useBooks();
  const cancelled = useRef(false);
  const ext = (fileName.split('.').pop() || 'TXT').toUpperCase().slice(0, 4);
  const sizeLabel = fileSize >= 1048576 ? (fileSize / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(fileSize / 1024)) + ' КБ';

  const run = async (job: () => Promise<ParsedBook>) => {
    cancelled.current = false;
    setStage('loading');
    setStep('Читаем файл…');
    setProgress(8);
    try {
      await new Promise((r) => setTimeout(r, 250));
      setProgress(45);
      const parsed = await job();
      if (cancelled.current) return;
      setStep('Разбиваем на главы…');
      setProgress(80);
      await new Promise((r) => setTimeout(r, 250));
      if (cancelled.current) return;
      setProgress(100);
      setBook(await store(parsed));
      setStage('done');
    } catch (e) {
      if (e instanceof ImportError) setErr({ title: e.message, hint: e.hint });
      else setErr({ title: 'Не получилось открыть файл', hint: 'Попробуй другой файл или вставь текст вручную.' });
      setStage('error');
    }
  };

  const onFile = (f?: File) => {
    if (!f) return;
    setFileName(f.name);
    setFileSize(f.size);
    run(() => parseFile(f));
  };

  const top = (
    <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(var(--safe-top) + 12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
      <button className="icon-btn" aria-label={stage === 'paste' ? 'Назад' : 'Закрыть'} onClick={() => (stage === 'paste' ? setStage('pick') : nav(-1))}>{stage === 'paste' ? Icon.back() : Icon.close()}</button>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{stage === 'paste' ? 'Вставить текст' : 'Новый текст'}</span>
      <span style={{ width: 44 }} />
    </div>
  );

  return (
    <div className="fill" style={{ padding: 0 }}>
      {top}
      <input ref={input} type="file" accept=".txt,.epub,.fb2,.zip,text/plain,application/epub+zip" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />

      {stage === 'pick' && (
        <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(var(--safe-top) + 80px)', bottom: 'calc(var(--safe-bottom) + 32px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h1 style={{ margin: '0 8px', fontSize: 32, lineHeight: '35px', fontWeight: 700, letterSpacing: '-0.04em' }}>Что будем<br />читать?</h1>
          <div
            style={{ marginTop: 20, background: '#FFFFFF', borderRadius: 32, padding: 8 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
          >
            <div style={{ border: '1.5px dashed #D3CDC2', borderRadius: 26, padding: '22px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 28, background: '#161513', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.upload()}</span>
              <div style={{ marginTop: 12, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Загрузи книгу или конспект</div>
              <div style={{ marginTop: 4, fontSize: 14, color: '#706C64' }}>TXT, EPUB или FB2, до 60 МБ</div>
              <button onClick={() => input.current?.click()} style={{ marginTop: 16, height: 48, padding: '0 22px', borderRadius: 24, background: '#161513', color: '#FFFFFF', fontSize: 15, fontWeight: 600 }}>Открыть файлы</button>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setStage('paste')} style={{ width: '100%', textAlign: 'left', borderRadius: 24, background: '#FFFFFF', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              {Icon.clipboard()}
              <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Вставить текст</span><span style={{ display: 'block', fontSize: 13, color: '#706C64', marginTop: 2 }}>из буфера обмена</span></span>
              <span style={{ color: '#9A958C' }}>{Icon.chevron()}</span>
            </button>
          </div>
          {books.length > 0 && (
            <>
              <div style={{ marginTop: 22, padding: '0 8px', fontSize: 14, color: '#706C64' }}>Недавние файлы</div>
              <div style={{ marginTop: 8, background: '#FFFFFF', borderRadius: 24, padding: '2px 14px' }}>
                {[...books].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3).map((b, k, a) => (
                  <button key={b.id} onClick={() => nav(`/read/${b.id}`)} style={{ width: '100%', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', borderBottom: `1px solid ${k === a.length - 1 ? 'transparent' : '#F3EFE9'}` }}>
                    <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', background: b.format === 'EPUB' || b.format === 'FB2' ? '#161513' : '#EFECE5', color: b.format === 'EPUB' || b.format === 'FB2' ? '#FFFFFF' : '#161513', textTransform: 'uppercase' }}>{b.format === 'Текст' ? 'ТЕКСТ' : b.format}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</span>
                      <span style={{ display: 'block', fontSize: 13, color: '#706C64', marginTop: 2 }}>{relDate(b.addedAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {stage === 'paste' && (
        <div style={{ position: 'absolute', left: 20, right: 20, top: 'calc(var(--safe-top) + 80px)', bottom: 'calc(var(--safe-bottom) + 24px)', display: 'flex', flexDirection: 'column' }}>
          <label className="label" htmlFor="pt">Название</label>
          <input id="pt" className="field" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="Например, Лекция 5" />
          <label className="label" htmlFor="px" style={{ marginTop: 16 }}>Текст</label>
          <textarea id="px" className="field" style={{ flex: 1 }} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Вставь сюда скопированный текст" />
          <div className="meta num" style={{ marginTop: 8 }}>{countWords(pasteText)} слов</div>
          <button className="btn btn-dark" style={{ marginTop: 12 }} disabled={countWords(pasteText) < 3} onClick={() => { setFileName(pasteTitle.trim() || 'Текст'); setFileSize(0); run(async () => parsePasted(pasteText, pasteTitle)); }}>Добавить</button>
        </div>
      )}

      {stage === 'loading' && (
        <div style={{ position: 'absolute', left: 24, right: 24, top: 'calc(var(--safe-top) + 104px)', bottom: 'calc(var(--safe-bottom) + 40px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Orb size={220} />
          <h1 style={{ margin: '4px 0 0', fontSize: 30, lineHeight: '33px', fontWeight: 700, letterSpacing: '-0.04em' }}>Готовим текст</h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: '21px', color: '#706C64' }}>{step}</p>
          <div style={{ marginTop: 28, alignSelf: 'stretch', background: '#FFFFFF', borderRadius: 24, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161513', color: '#FFFFFF' }}>{fileSize ? ext : 'ТЕКСТ'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
                <span className="num" style={{ display: 'block', fontSize: 13, color: '#706C64', marginTop: 2 }}>{fileSize ? sizeLabel + ', ' : ''}{progress}%</span>
              </span>
            </div>
            <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: '#EFECE5', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(160deg, #FF9A3C, #FF6F9C)', transition: 'width .25s linear', width: progress + '%' }} />
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => { cancelled.current = true; setStage('pick'); }} style={{ height: 48, padding: '0 22px', borderRadius: 24, background: '#FFFFFF', fontSize: 15, fontWeight: 600 }}>Отменить</button>
        </div>
      )}

      {stage === 'done' && book && (
        <div style={{ position: 'absolute', left: 24, right: 24, top: 'calc(var(--safe-top) + 92px)', bottom: 'calc(var(--safe-bottom) + 32px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Orb size={210} mood="happy" />
          <h1 style={{ margin: '2px 0 0', fontSize: 30, lineHeight: '33px', fontWeight: 700, letterSpacing: '-0.04em' }}>Книга добавлена</h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: '21px', color: '#706C64' }}>{book.chapterTitles.length > 1 ? 'Главы и оглавление сохранились.' : 'Текст сохранился в библиотеке.'}</p>
          <div style={{ marginTop: 22, alignSelf: 'stretch', background: '#FFFFFF', borderRadius: 28, padding: 14, display: 'flex', gap: 14, textAlign: 'left' }}>
            <div aria-hidden="true" style={{ flex: 'none', width: 70, height: 100, borderRadius: '5px 9px 9px 5px', background: book.color, color: 'rgba(255,255,255,0.92)', padding: '9px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'inset 3px 0 0 rgba(0,0,0,0.16)' }}>
              <div lang="ru" style={{ ...coverTitleStyle, fontSize: coverTitleSize(book.title, 54, 13), lineHeight: 1.08, WebkitLineClamp: 5 }}>{book.title}</div>
              <div style={{ fontSize: 6, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden' }}>{book.author || book.format}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</div>
              {book.author && <div style={{ fontSize: 14, color: '#706C64', marginTop: 2 }}>{book.author}</div>}
              <div style={{ marginTop: 12, display: 'flex' }}><span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', padding: '5px 10px', borderRadius: 10, background: '#EFECE5', textTransform: 'uppercase' }}>{book.format}</span></div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => nav(`/read/${book.id}`, { replace: true })} style={{ alignSelf: 'stretch', height: 56, borderRadius: 28, background: '#161513', color: '#FFFFFF', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>{Icon.play(15)}Читать сейчас</button>
          <button onClick={() => nav('/library', { replace: true })} style={{ marginTop: 8, alignSelf: 'stretch', height: 48, fontSize: 15, fontWeight: 600 }}>В библиотеку</button>
        </div>
      )}

      {stage === 'error' && err && (
        <div style={{ position: 'absolute', left: 24, right: 24, top: 'calc(var(--safe-top) + 92px)', bottom: 'calc(var(--safe-bottom) + 32px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Orb size={210} mood="sad" tone="muted" />
          <h1 style={{ margin: '2px 0 0', fontSize: 30, lineHeight: '33px', fontWeight: 700, letterSpacing: '-0.04em' }}>Не получилось открыть</h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: '21px', color: '#706C64' }}>{err.title}. Попробуй другой файл.</p>
          {fileName && fileSize > 0 && (
            <div style={{ marginTop: 22, alignSelf: 'stretch', background: '#FFFFFF', borderRadius: 24, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6DCD3', color: '#8E2B12' }}>{ext}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
                <span style={{ display: 'block', fontSize: 13, color: '#8E2B12', marginTop: 2 }}>{err.title}</span>
              </span>
            </div>
          )}
          <div style={{ marginTop: 10, alignSelf: 'stretch', borderRadius: 24, padding: '14px 16px', background: '#EFECE5', textAlign: 'left', fontSize: 14, lineHeight: '20px', color: '#4F4B45' }}>{err.hint}</div>
          <div style={{ flex: 1 }} />
          <button onClick={() => { setStage('pick'); input.current?.click(); }} style={{ alignSelf: 'stretch', height: 56, borderRadius: 28, background: '#161513', color: '#FFFFFF', fontSize: 17, fontWeight: 600 }}>Выбрать другой файл</button>
          <button onClick={() => setStage('paste')} style={{ marginTop: 8, alignSelf: 'stretch', height: 48, fontSize: 15, fontWeight: 600 }}>Вставить текст вручную</button>
        </div>
      )}
    </div>
  );
}
