import { getNotificationPreferences } from '../services/preferencesService';

export async function requestBrowserNotifications() {
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInstalledApp = navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (isAppleMobile && !isInstalledApp) {
    return { ok: false, message: 'No iPhone ou iPad, adicione o app à Tela de Início e abra por lá para permitir notificações.' };
  }
  if (!('Notification' in window)) return { ok: false, message: 'Este navegador não oferece notificações.' };
  if (!window.isSecureContext) return { ok: false, message: 'Para ativar avisos no celular, abra o site usando HTTPS.' };
  if (Notification.permission === 'denied') {
    return { ok: false, message: 'As notificações estão bloqueadas no navegador. Altere a permissão nas configurações do site.' };
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission === 'granted' && 'serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
    } catch {
      return { ok: false, message: 'Não foi possível preparar as notificações neste dispositivo.' };
    }
  }
  return permission === 'granted'
    ? { ok: true, message: 'Notificações do navegador ativadas.' }
    : { ok: false, message: 'Permissão não concedida. Você ainda pode usar as preferências dentro do sistema.' };
}

export async function sendNotification(type, title, body) {
  const preferences = getNotificationPreferences();
  if (!preferences[type]) return { ok: false, message: 'Este tipo de notificação está desativado nas preferências.' };
  if (!preferences.browserEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
    return { ok: false, message: 'Ative primeiro as notificações do navegador.' };
  }
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/icons/labware-192.png',
        badge: '/favicon.svg',
        data: { url: '/chamados' },
      });
    } else {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  } catch {
    return { ok: false, message: 'Não foi possível mostrar a notificação neste dispositivo.' };
  }
  return { ok: true, message: 'Notificação de teste enviada.' };
}

export function showDemoNotification(type = 'assigned') {
  return sendNotification(type, 'LabWare · Central de Suporte', 'Este é um aviso de teste. Suas preferências estão funcionando.');
}
