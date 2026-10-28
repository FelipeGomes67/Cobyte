import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, BellOff, Eye, EyeOff, Save } from 'lucide-react';
import { getNotificationPreferences, saveNotificationPreferences } from '../services/preferencesService';
import { requestBrowserNotifications, showDemoNotification } from '../utils/notifications';

const notificationOptions = [
  ['assigned', 'Novo chamado atribuído a mim'],
  ['critical', 'Chamado Crítico criado'],
  ['sla', "SLA’s próximos de vencimentos"],
  ['reply', 'Cliente respondeu um chamado'],
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('aba') === 'notificacoes' ? 'notifications' : 'security';
  const [preferences, setPreferences] = useState(getNotificationPreferences);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const [working, setWorking] = useState(false);

  function selectTab(nextTab) {
    setSearchParams(nextTab === 'notifications' ? { aba: 'notificacoes' } : {});
    setMessage('');
  }

  function changeNotification(key, enabled) {
    setPreferences(current => ({ ...current, [key]: enabled }));
    setMessage('');
  }

  async function enableDeviceNotifications() {
    setWorking(true);
    const result = await requestBrowserNotifications();
    setPermission('Notification' in window ? Notification.permission : 'unsupported');
    if (result.ok) {
      const next = { ...preferences, browserEnabled: true };
      setPreferences(next);
      const saved = saveNotificationPreferences(next);
      setMessage(saved.ok ? result.message : saved.message);
      setMessageType(saved.ok ? 'success' : 'error');
    } else {
      const next = { ...preferences, browserEnabled: false };
      setPreferences(next);
      saveNotificationPreferences(next);
      setMessage(result.message);
      setMessageType('error');
    }
    setWorking(false);
  }

  function savePreferences() {
    const result = saveNotificationPreferences(preferences);
    setMessage(result.ok ? 'Preferências salvas neste navegador.' : result.message);
    setMessageType(result.ok ? 'success' : 'error');
  }

  async function testNotification() {
    const result = await showDemoNotification();
    setMessage(result.message);
    setMessageType(result.ok ? 'success' : 'error');
  }

  function disableDeviceNotifications() {
    const next = { ...preferences, browserEnabled: false };
    setPreferences(next);
    const result = saveNotificationPreferences(next);
    setMessage(result.ok ? 'Notificações do dispositivo desativadas.' : result.message);
    setMessageType(result.ok ? 'success' : 'error');
  }

  const permissionLabel = permission === 'granted' ? 'Permissão concedida' : permission === 'denied' ? 'Bloqueadas no navegador' : permission === 'unsupported' ? 'Não suportadas neste navegador' : 'Aguardando autorização';

  function changePassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get('newPassword') || '').length < 8) {
      setMessage('A nova senha deve ter pelo menos 8 caracteres.');
      setMessageType('error');
      return;
    }
    setMessage('A troca de senha depende do serviço de autenticação do backend. Nenhuma alteração foi feita.');
    setMessageType('info');
  }

  return <>
    <div className="page-heading settings-heading"><div><h1>Configurações</h1><p>Gerencie preferências para a central de suporte</p></div></div>
    <div className="settings-layout">
      <div className="settings-tabs" role="tablist" aria-label="Configurações da conta">
        <button role="tab" aria-selected={tab === 'security'} className={tab === 'security' ? 'selected' : ''} onClick={() => selectTab('security')}>Segurança</button>
        <button role="tab" aria-selected={tab === 'notifications'} className={tab === 'notifications' ? 'selected' : ''} onClick={() => selectTab('notifications')}>Notificações</button>
      </div>

      <section className={`panel settings-panel settings-reference-card ${tab === 'security' ? 'security-card' : 'notification-card'}`}>
      {tab === 'security' ? <>
        <div className="settings-panel-heading"><h2>Segurança da conta</h2></div>
        <p className="settings-limitation">A troca de senha fica indisponível enquanto este protótipo não estiver conectado ao backend de autenticação.</p>
        <form onSubmit={changePassword}>
          <label className="form-label">Senha Atual<div className="password-wrap"><input name="currentPassword" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••" required/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
          <label className="form-label">Nova Senha<div className="password-wrap"><input name="newPassword" type={showPassword ? 'text' : 'password'} minLength="8" autoComplete="new-password" placeholder="••••••" required/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
          <div className="settings-footer">{message && <span className={`settings-message ${messageType}`} role="status">{message}</span>}<button className="primary-button" type="submit"><Save size={16}/> Atualizar senha</button></div>
        </form>
      </> : <>
        <div className="settings-panel-heading"><h2>Preferências de notificação</h2></div>
        <div className="device-notification-card"><span className={`device-notification-icon ${preferences.browserEnabled ? 'enabled' : ''}`}>{preferences.browserEnabled ? <Bell size={18}/> : <BellOff size={18}/>}</span><div className="device-notification-copy"><strong>Notificações neste dispositivo</strong><span>{permissionLabel}</span></div>{preferences.browserEnabled ? <button className="secondary-button" onClick={disableDeviceNotifications}>Desativar</button> : <button className="primary-button" onClick={enableDeviceNotifications} disabled={working}>{working ? 'Aguardando…' : 'Ativar'}</button>}</div>
        <div className="notification-options">{notificationOptions.map(([key, label]) => <label className="check-row" key={key}><span>{label}</span><input type="checkbox" checked={preferences[key]} onChange={event => changeNotification(key, event.target.checked)}/></label>)}</div>
        <div className="settings-footer">{message && <span className={`settings-message ${messageType}`} role="status">{message}</span>}<button className="secondary-button" onClick={testNotification}><Bell size={15}/> Testar</button><button className="primary-button" onClick={savePreferences}><Save size={16}/> Salvar</button></div>
      </>}
      </section>
    </div>
  </>;
}
