import { useState } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import { getNotificationPreferences, saveNotificationPreferences, updatePassword } from '../data/mockDatabase';
import { requestBrowserNotifications } from '../utils/notifications';

const notificationOptions = [
  ['assigned', 'Novo chamado atribuído a mim'],
  ['critical', 'Chamado Crítico criado'],
  ['sla', "SLA’s próximos de vencimentos"],
  ['reply', 'Cliente respondeu um chamado'],
];

export default function SettingsPage() {
  const [tab, setTab] = useState('security');
  const [preferences, setPreferences] = useState(getNotificationPreferences);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  async function changeNotification(key, enabled) {
    let next = { ...preferences, [key]: enabled };
    if (enabled && (!('Notification' in window) || Notification.permission !== 'granted')) {
      const permission = await requestBrowserNotifications();
      if (!permission.ok) {
        setMessage(permission.message);
        setMessageType('error');
        return;
      }
      next = { ...next, browserEnabled: true };
      setMessage('Permissão concedida. Clique em Salvar para aplicar.');
      setMessageType('success');
    } else if (enabled && Notification.permission === 'granted') {
      next = { ...next, browserEnabled: true };
      setMessage('');
    } else {
      setMessage('');
    }
    setPreferences(next);
  }

  async function savePreferences() {
    let next = preferences;
    const hasEnabledEvents = notificationOptions.some(([key]) => preferences[key]);
    if (hasEnabledEvents && 'Notification' in window && Notification.permission === 'granted') {
      next = { ...preferences, browserEnabled: true };
      setPreferences(next);
    } else if (hasEnabledEvents && 'Notification' in window && Notification.permission !== 'granted') {
      const permission = await requestBrowserNotifications();
      if (permission.ok) {
        next = { ...preferences, browserEnabled: true };
        setPreferences(next);
      } else {
        next = { ...preferences, browserEnabled: false };
        setPreferences(next);
        setMessage(permission.message);
        setMessageType('error');
      }
    } else if (hasEnabledEvents && !('Notification' in window)) {
      next = { ...preferences, browserEnabled: false };
      setPreferences(next);
      setMessage('Este navegador não oferece notificações do sistema.');
      setMessageType('error');
    }
    saveNotificationPreferences(next);
    if (next.browserEnabled) {
      setMessage('Preferências salvas. Notificações do dispositivo ativadas.');
      setMessageType('success');
    } else if (('Notification' in window && Notification.permission === 'granted') || !hasEnabledEvents) {
      setMessage('Preferências salvas.');
      setMessageType('success');
    }
  }

  function changePassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!updatePassword(form.get('currentPassword'), form.get('newPassword'))) {
      setMessage('A senha atual não confere.');
      setMessageType('error');
      return;
    }
    event.currentTarget.reset();
    setMessage('Senha atualizada.');
    setMessageType('success');
  }

  return <>
    <div className="page-heading settings-heading"><div><h1>Configurações</h1><p>Gerencie preferências para a central de suporte</p></div></div>
    <div className="settings-layout">
      <div className="settings-tabs" role="tablist" aria-label="Configurações da conta">
        <button role="tab" aria-selected={tab === 'security'} className={tab === 'security' ? 'selected' : ''} onClick={() => {setTab('security'); setMessage('');}}>Segurança</button>
        <button role="tab" aria-selected={tab === 'notifications'} className={tab === 'notifications' ? 'selected' : ''} onClick={() => {setTab('notifications'); setMessage('');}}>Notificações</button>
      </div>

      <section className={`panel settings-panel settings-reference-card ${tab === 'security' ? 'security-card' : 'notification-card'}`}>
      {tab === 'security' ? <>
        <div className="settings-panel-heading"><h2>Segurança da conta</h2></div>
        <form onSubmit={changePassword}>
          <label className="form-label">Senha Atual<div className="password-wrap"><input name="currentPassword" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••" required/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
          <label className="form-label">Nova Senha<div className="password-wrap"><input name="newPassword" type={showPassword ? 'text' : 'password'} minLength="8" autoComplete="new-password" placeholder="••••••" required/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
          <div className="settings-footer">{message && <span className={`settings-message ${messageType}`} role="status">{message}</span>}<button className="primary-button" type="submit"><Save size={16}/> Atualizar senha</button></div>
        </form>
      </> : <>
        <div className="settings-panel-heading"><h2>Preferências de notificação</h2></div>
        <div className="notification-options">{notificationOptions.map(([key, label]) => <label className="check-row" key={key}><span>{label}</span><input type="checkbox" checked={preferences[key]} onChange={event => changeNotification(key, event.target.checked)}/></label>)}</div>
        <div className="settings-footer">{message && <span className={`settings-message ${messageType}`} role="status">{message}</span>}<button className="primary-button" onClick={savePreferences}><Save size={16}/> Salvar</button></div>
      </>}
      </section>
    </div>
  </>;
}
