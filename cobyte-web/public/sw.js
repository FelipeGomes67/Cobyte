self.addEventListener('notificationclick', event => {
  let destination = new URL('/chamados', self.location.origin).href;
  try {
    const url = new URL(event.notification.data?.url || '/chamados', self.location.origin);
    if (['http:', 'https:'].includes(url.protocol) && url.origin === self.location.origin) destination = url.href;
  } catch { /* Aviso inválido usa a listagem local de chamados. */ }
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appWindow = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (appWindow) {
      await appWindow.navigate(destination);
      return appWindow.focus();
    }
    return self.clients.openWindow(destination);
  })());
});

self.addEventListener('push', event => {
  const payload = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(payload.title || 'Cobyte · Central de Suporte', {
    body: payload.body || 'Você tem uma atualização em um chamado.',
    icon: '/icons/cobyte-192.png',
    badge: '/favicon.svg',
    data: { url: payload.url || '/chamados' },
  }));
});
