import { useState } from 'react';
import { ArrowRight, MessagesSquare } from 'lucide-react';
import { CURRENT_USER } from '../role-center/demoAccount';
import { Confirm, Dialog } from '../role-center/ui';
import { A2A_OPTIONS, readA2ASettings, sameSettings, settingsKey } from './a2aSettings';
import './a2a-settings.css';

export default function A2ACollaborationSettings() {
  const [saved, setSaved] = useState(() => readA2ASettings(CURRENT_USER));
  const [draft, setDraft] = useState(saved);
  const [open, setOpen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const dirty = !sameSettings(saved, draft);
  const close = () => dirty ? setDiscard(true) : setOpen(false);
  const save = () => {
    try {
      localStorage.setItem(settingsKey(CURRENT_USER), JSON.stringify(draft));
      setSaved({ ...draft }); setOpen(false); setNotice('A2A 协作设置已保存'); setError('');
    } catch { setError('保存失败，当前设置未更改，请重试。'); }
  };
  return <section className="flat-section a2a-settings-section">
    <div className="heading"><h2>A2A 协作</h2></div>
    <button className="a2a-settings-entry" onClick={() => { setDraft({ ...saved }); setNotice(''); setError(''); setOpen(true); }}>
      <span className="a2a-settings-icon"><MessagesSquare size={22}/></span>
      <span className="a2a-settings-entry-copy"><strong>协作设置</strong><span>决定分身何时自动回复，何时先问你</span><small>{saved.clarify ? '允许自动追问' : '追问需确认'} · {saved.deliver ? '成果可自动发送' : '成果发送需确认'}</small></span>
      <ArrowRight size={18}/>
    </button>
    {notice && <p className="a2a-settings-notice" role="status">{notice}</p>}
    {open && <Dialog title="A2A 协作设置" onClose={close} wide footer={<>
      <button onClick={close}>取消</button>
      <button className="rc-primary" disabled={!dirty} onClick={save}>保存设置</button>
    </>}>
      <div className="a2a-settings-body">
        <p className="a2a-settings-intro">这些设置控制你的分身如何处理收到的协作事项，适用于单人和多人协作。</p>
        {A2A_OPTIONS.map(option => <label className="a2a-setting-row" key={option.key}>
          <span><strong>{option.title}</strong><small>{option.description}</small></span>
          <select aria-label={option.title} value={draft[option.key] ? 'auto' : 'confirm'} onChange={event => setDraft({ ...draft, [option.key]: event.target.value === 'auto' })}>
            <option value="auto">{option.automatic}</option><option value="confirm">{option.manual}</option>
          </select>
        </label>)}
        <p className="a2a-settings-footnote">保存后用于后续动作判断，不追溯撤回已发送内容。已有待确认事项仍需本人处理。</p>
        {error && <p role="alert" className="a2a-settings-error">{error}</p>}
      </div>
    </Dialog>}
    {discard && <Confirm title="放弃未保存的协作设置？" description="关闭后继续使用上一次保存的设置。" label="放弃修改" onClose={() => setDiscard(false)} onConfirm={() => { setDiscard(false); setOpen(false); }}/>}
  </section>;
}
