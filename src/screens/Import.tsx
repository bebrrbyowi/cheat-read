import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cover, Icon, Orb } from '../components/ui';
import { parseFile, parsePasted, coverColor, ImportError, type ParsedBook } from '../lib/importers';
import { saveBook, uid, type BookMeta } from '../lib/db';
import { countWords } from '../lib/text';
import { changed } from '../lib/store';

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

  const run = async (job: () => Promise<ParsedBook>) => {
    setStage('loading');
    setStep('Читаем файл…');
    try {
      await new Promise((r) => setTimeout(r, 250));
      const parsed = await job();
      setStep('Разбиваем на главы…');
      await new Promise((r) => setTimeout(r, 250));
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
        <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(var(--safe-top) + 80px)' }}>
          <h1 className="h1" style={{ margin: '0 8px' }}>Что будем<br />читать?</h1>
          <div
            className="card" style={{ marginTop: 20, borderRadius: 32, padding: 8 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
          >
            <div className="empty" style={{ border: '1.5px dashed #D3CDC2', borderRadius: 26, padding: '22px 20px 20px' }}>
              <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.upload()}</span>
              <div style={{ marginTop: 12, fontSize: 18, fontWeight: 600 }}>Загрузи книгу или конспект</div>
              <div className="small" style={{ marginTop: 4 }}>TXT, EPUB или FB2</div>
              <button className="btn-sm btn-dark" style={{ marginTop: 16, height: 48, padding: '0 22px' }} onClick={() => input.current?.click()}>Открыть файлы</button>
            </div>
          </div>
          <button className="card" onClick={() => setStage('paste')} style={{ marginTop: 10, width: '100%', textAlign: 'left', borderRadius: 24, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {Icon.clipboard()}
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Вставить текст</span><span className="meta" style={{ display: 'block', marginTop: 2 }}>из буфера обмена</span></span>
            <span style={{ color: '#9A958C' }}>{Icon.chevron()}</span>
          </button>
        </div>
      )}

      {stage === 'paste' && (
        <div style={{ position: 'absolute', left: 20, right: 20, top: 'calc(var(--safe-top) + 80px)', bottom: 'calc(var(--safe-bottom) + 24px)', display: 'flex', flexDirection: 'column' }}>
          <label className="label" htmlFor="pt">Название</label>
          <input id="pt" className="field" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="Например, Лекция 5" />
          <label className="label" htmlFor="px" style={{ marginTop: 16 }}>Текст</label>
          <textarea id="px" className="field" style={{ flex: 1 }} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Вставь сюда скопированный текст" />
          <div className="meta num" style={{ marginTop: 8 }}>{countWords(pasteText)} слов</div>
          <button className="btn btn-dark" style={{ marginTop: 12 }} disabled={countWords(pasteText) < 3} onClick={() => { setFileName('текст'); run(async () => parsePasted(pasteText, pasteTitle)); }}>Добавить</button>
        </div>
      )}

      {stage === 'loading' && (
        <div className="empty" style={{ position: 'absolute', left: 24, right: 24, top: 'calc(var(--safe-top) + 120px)' }}>
          <Orb size={220} />
          <h1 className="h1" style={{ fontSize: 30 }}>Готовим текст</h1>
          <p className="body" style={{ marginTop: 8, fontSize: 15 }}>{step}</p>
          <div className="small" style={{ marginTop: 16, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
        </div>
      )}

      {stage === 'done' && book && (
        <div style={{ position: 'absolute', left: 24, right: 24, top: 'calc(var(--safe-top) + 80px)', bottom: 'calc(var(--safe-bottom) + 24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ flex: 1 }} />
          <Orb size={200} mood="happy" />
          <h1 className="h1" style={{ fontSize: 30 }}>Книга добавлена</h1>
          <p className="body" style={{ marginTop: 8, fontSize: 15 }}>Главы и оглавление сохранились.</p>
          <div className="card" style={{ marginTop: 22, alignSelf: 'stretch', padding: 14, display: 'flex', gap: 14, textAlign: 'left' }}>
            <Cover color={book.color} w={70} h={100} title={book.title} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</div>
              {book.author && <div className="small" style={{ marginTop: 2 }}>{book.author}</div>}
              <div style={{ marginTop: 12, display: 'flex' }}><span className="badge">{book.format}</span></div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-dark" onClick={() => nav(`/read/${book.id}`, { replace: true })}>{Icon.play(15)}Читать сейчас</button>
          <button className="btn-text" style={{ marginTop: 8 }} onClick={() => nav('/library', { replace: true })}>В библиотеку</button>
        </div>
      )}

      {stage === 'error' && err && (
        <div style={{ position: 'absolute', left: 24, right: 24, top: 'calc(var(--safe-top) + 80px)', bottom: 'calc(var(--safe-bottom) + 24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ flex: 1 }} />
          <Orb size={200} mood="sad" tone="muted" />
          <h1 className="h1" style={{ fontSize: 30 }}>Не получилось открыть</h1>
          <p className="body" style={{ marginTop: 8, fontSize: 15 }}>{err.title}. {err.hint}</p>
          {fileName && <div className="small" style={{ marginTop: 14, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>}
          <div style={{ flex: 1 }} />
          <button className="btn btn-dark" onClick={() => { setStage('pick'); input.current?.click(); }}>Выбрать другой файл</button>
          <button className="btn-text" style={{ marginTop: 8 }} onClick={() => setStage('paste')}>Вставить текст вручную</button>
        </div>
      )}
    </div>
  );
}
