import api from './api';
export function suportaPush() { return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
export async function inscricaoAtual() {
  if (!suportaPush()) return null;
  const registro = await navigator.serviceWorker.getRegistration('/');
  return registro ? registro.pushManager.getSubscription() : null;
}
export async function ativarPush(usuarioId) {
  if (!suportaPush()) throw new Error('Este navegador precisa de HTTPS e suporte a Web Push.');
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('Autorize as notificações nas configurações do navegador.');
  const { data: config } = await api.get('/push/config');
  if (!config.habilitado) throw new Error('As chaves Web Push ainda não foram configuradas no servidor.');
  await navigator.serviceWorker.register('/push-sw.js');
  const registro = await navigator.serviceWorker.ready;
  let inscricao = await registro.pushManager.getSubscription();
  if (inscricao && localStorage.getItem('labware-push-usuario') !== String(usuarioId)) {
    await inscricao.unsubscribe();
    inscricao = null;
  }
  const base64 = config.publicKey.replace(/-/g, '+').replace(/_/g, '/');
  const chave = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  if (!inscricao) inscricao = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });
  const dados = inscricao.toJSON();
  try {
    await api.post('/push/inscricoes', { endpoint: dados.endpoint, p256dh: dados.keys.p256dh, auth: dados.keys.auth });
    localStorage.setItem('labware-push-usuario', String(usuarioId));
  } catch (erro) { await inscricao.unsubscribe(); throw erro; }
}
export async function desativarPush() {
  const inscricao = await inscricaoAtual();
  if (inscricao) {
    // Mesmo offline, cancela no navegador para impedir avisos da conta anterior.
    try { await api.post('/push/remover', { endpoint: inscricao.endpoint }); }
    finally { await inscricao.unsubscribe(); localStorage.removeItem('labware-push-usuario'); }
  }
}
