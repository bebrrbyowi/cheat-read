import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Confirm, Icon, Range, Segmented } from '../components/ui';
import { useSettings, setSettings, resetSettings } from '../lib/settings';
import { wipeAll } from '../lib/db';
import { changed } from '../lib/store';

export default function Profile() {
  const nav = useNavigate();
  const st = useSettings();
  const [name, setName] = useState(st.name);
  const [confirm, setConfirm] = useState(false);
  const section: React.CSSProperties = { margin: '24px 8px 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' };
  const row: React.CSSProperties = { padding: '14px 0', borderBottom: '1px solid #F3EFE9' };

  return (
    <div className="screen no-nav">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="icon-btn" aria-label="Назад" onClick={() => nav(-1)}>{Icon.back()}</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Профиль</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16, padding: '0 4px' }}>
        <div style={{ flex: 'none', width: 72, height: 72, borderRadius: 36, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>{(name.trim()[0] || '?').toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label className="label" htmlFor="nm" style={{ marginBottom: 6 }}>Имя</label>
          <input id="nm" className="field" style={{ height: 48 }} value={name} placeholder="Как тебя зовут?" onChange={(e) => setName(e.target.value)} onBlur={() => setSettings({ name: name.trim() })} />
        </div>
      </div>

      <h2 style={section}>Чтение</h2>
      <div className="card" style={{ borderRadius: 24, padding: '4px 16px' }}>
        <div style={row}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Цель на день</div>
          <Segmented label="Цель на день" value={st.goal} onChange={(v) => setSettings({ goal: v })} options={[10, 20, 30, 45].map((v) => ({ value: v, label: v + ' мин' }))} style={{ marginTop: 10 }} />
        </div>
        <div style={{ ...row, borderBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Скорость</span>
            <span className="num" style={{ fontSize: 15 }}><b>{st.wpm}</b> <span style={{ color: 'var(--muted)' }}>сл/мин</span></span>
          </div>
          <div style={{ marginTop: 10 }}><Range min={150} max={800} step={10} value={st.wpm} onChange={(v) => setSettings({ wpm: v })} label="Скорость, слов в минуту" /></div>
        </div>
      </div>

      <h2 style={section}>Данные</h2>
      <div className="card" style={{ borderRadius: 24, padding: '4px 16px' }}>
        <div style={{ ...row, fontSize: 14, color: 'var(--muted)', lineHeight: '20px' }}>Книги, цитаты и прогресс хранятся только в этом браузере. Если очистить данные сайта, они пропадут.</div>
        <button onClick={() => setConfirm(true)} style={{ width: '100%', textAlign: 'left', padding: '14px 0', fontSize: 16, fontWeight: 600, color: 'var(--danger)' }}>Удалить все данные</button>
      </div>
      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--faint)' }}>Версия 0.1</div>

      <Confirm
        open={confirm}
        title="Удалить все данные?"
        text="Книги, цитаты и прогресс удалятся без возможности восстановить."
        okLabel="Удалить"
        danger
        onCancel={() => setConfirm(false)}
        onOk={async () => { await wipeAll(); resetSettings(); changed(); setConfirm(false); nav('/onboarding', { replace: true }); }}
      />
    </div>
  );
}
