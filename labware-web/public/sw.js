self.addEventListener('notificationclick', event => {
  const destination = event.notification.data?.url || '/chamados';
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
  event.waitUntil(self.registration.showNotification(payload.title || 'LabWare · Central de Suporte', {
    body: payload.body || 'Você tem uma atualização em um chamado.',
    icon: '/icons/labware-192.png',
    badge: '/favicon.svg',
    data: { url: payload.url || '/chamados' },
  }));
});
