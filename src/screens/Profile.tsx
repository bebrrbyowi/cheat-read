import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Range, Sheet } from '../components/ui';
import { useSettings, setSettings, resetSettings } from '../lib/settings';
import { wipeAll } from '../lib/db';
import { changed } from '../lib/store';

/* Экран по макету «9 · Профиль». Аккаунтов пока нет, поэтому вместо «Выйти» и
   «Удалить аккаунт» только «Удалить все данные»; напоминаний и темы приложения в v1 нет. */

const muted = '#6E675D';
const section: React.CSSProperties = { margin: '24px 8px 8px', fontSize: 13, fontWeight: 600, color: muted };
const group: React.CSSProperties = { background: '#FFFFFF', borderRadius: 24, padding: '4px 16px' };
const seg = (on: boolean): React.CSSProperties => ({ background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 1px 3px rgba(23,20,15,0.12)' : 'none' });

export default function Profile() {
  const nav = useNavigate();
  const st = useSettings();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(st.name);
  const [speed, setSpeed] = useState(false);
  const [del, setDel] = useState(false);
  const shown = st.name.trim();

  return (
    <div className="screen no-nav" style={{ color: '#17140F' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button aria-label="Назад на главную" onClick={() => nav(-1)} style={{ width: 44, height: 44, borderRadius: 22, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(23,20,15,0.08)' }}>{Icon.back()}</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Профиль</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16, padding: '0 4px' }}>
        <div style={{ flex: 'none', width: 72, height: 72, borderRadius: 36, background: '#17140F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>{(shown[0] || '?').toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26, lineHeight: '29px', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: shown ? '#17140F' : '#A39B8F' }}>{shown || 'Без имени'}</div>
        </div>
        <button onClick={() => { setName(st.name); setEdit(true); }} style={{ flex: 'none', height: 36, padding: '0 14px', borderRadius: 18, background: '#F3EFE9', fontSize: 14, fontWeight: 600 }}>Изменить</button>
      </div>

      <h2 style={section}>Чтение</h2>
      <div style={group}>
        <div style={{ padding: '14px 0', borderBottom: '1px solid #F3EFE9' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Цель на день</div>
          <div role="radiogroup" aria-label="Цель на день" style={{ marginTop: 10, display: 'flex', gap: 6, padding: 3, borderRadius: 16, background: '#F3EFE9' }}>
            {[10, 20, 30, 45].map((v) => (
              <button key={v} role="radio" aria-checked={st.goal === v} onClick={() => setSettings({ goal: v })} style={{ flex: 1, height: 36, borderRadius: 13, fontSize: 14, fontWeight: 600, ...seg(st.goal === v) }}>{v} мин</button>
            ))}
          </div>
        </div>
        <button onClick={() => setSpeed(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', textAlign: 'left' }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Скорость по умолчанию</span>
          <span className="num" style={{ fontSize: 15, color: muted }}>{st.wpm} сл/мин</span>
        </button>
      </div>

      <h2 style={section}>Данные</h2>
      <div style={group}>
        <div style={{ padding: '14px 0', borderBottom: '1px solid #F3EFE9', fontSize: 14, lineHeight: '20px', color: muted }}>Книги, цитаты и прогресс хранятся только в этом браузере.</div>
        <button onClick={() => setDel(true)} style={{ width: '100%', textAlign: 'left', padding: '14px 0', fontSize: 16, fontWeight: 600, color: '#B3261E' }}>Удалить все данные</button>
      </div>
      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: '#A39B8F' }}>Версия 0.1</div>

      <Sheet open={edit} onClose={() => setEdit(false)} label="Изменить профиль">
        <div style={{ padding: '0 4px' }}>
          <h2 style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Изменить профиль</h2>
          <label htmlFor="pn" style={{ display: 'block', marginTop: 18, fontSize: 13, color: muted }}>Имя</label>
          <input id="pn" type="text" value={name} placeholder="Как тебя зовут?" onChange={(e) => setName(e.target.value)} style={{ marginTop: 8, width: '100%', height: 52, border: 0, borderRadius: 16, padding: '0 16px', fontSize: 16, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px #E6E0D7', outline: 'none' }} />
          <button onClick={() => { setSettings({ name: name.trim() }); setEdit(false); }} style={{ marginTop: 20, width: '100%', height: 56, borderRadius: 28, background: '#17140F', color: '#FFFFFF', fontSize: 16, fontWeight: 600 }}>Сохранить</button>
        </div>
      </Sheet>

      <Sheet open={speed} onClose={() => setSpeed(false)} label="Скорость по умолчанию">
        <div style={{ padding: '0 4px' }}>
          <h2 style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Скорость по умолчанию</h2>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, color: muted }}>скорость</span>
            <span className="num" style={{ fontSize: 15 }}><b style={{ fontWeight: 700 }}>{st.wpm}</b> <span style={{ color: muted }}>сл/мин</span></span>
          </div>
          <div style={{ margin: '12px 6px 0' }}><Range min={150} max={800} step={10} value={st.wpm} onChange={(v) => setSettings({ wpm: v })} label="Скорость, слов в минуту" /></div>
          <button onClick={() => setSpeed(false)} style={{ marginTop: 20, width: '100%', height: 56, borderRadius: 28, background: '#17140F', color: '#FFFFFF', fontSize: 16, fontWeight: 600 }}>Готово</button>
        </div>
      </Sheet>

      {del && (
        <>
          <button aria-label="Закрыть" onClick={() => setDel(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(20,14,6,0.38)', zIndex: 30 }} />
          <div role="alertdialog" aria-label="Удалить все данные" style={{ position: 'absolute', left: 20, right: 20, top: '50%', transform: 'translateY(-50%)', borderRadius: 28, background: '#FCFBF8', padding: '22px 20px 18px', textAlign: 'center', zIndex: 31 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>Удалить все данные?</div>
            <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: '22px', color: muted }}>Книги, цитаты и прогресс удалятся без возможности восстановить.</p>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <button onClick={() => setDel(false)} style={{ height: 50, borderRadius: 25, background: '#F3EFE9', fontSize: 15, fontWeight: 600 }}>Отмена</button>
              <button onClick={async () => { await wipeAll(); resetSettings(); changed(); setDel(false); nav('/onboarding', { replace: true }); }} style={{ height: 50, borderRadius: 25, background: '#B3261E', color: '#FFFFFF', fontSize: 15, fontWeight: 600 }}>Удалить</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
