self.addEventListener('push', event => {
  let dados = {};
  try { dados = event.data?.json() || {}; } catch { /* Aviso generico se payload invalido. */ }
  event.waitUntil(self.registration.showNotification(dados.title || 'Labware', {
    body: dados.body || 'Há uma atualização no atendimento.',
    tag: dados.url || 'labware',
    data: { url: /^\/chamados\/\d+$/.test(dados.url || '') ? dados.url : '/notificacoes' },
  }));
});
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const caminho = event.notification.data?.url;
  const destino = new URL(/^\/chamados\/\d+$/.test(caminho || '') ? caminho : '/notificacoes', self.location.origin);
  event.waitUntil((async () => {
    const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Prioriza uma aba já no chamado e evita navegar uma referência descartada.
    const mesmaPagina = abas.find(aba => aba.url === destino.href);
    if (mesmaPagina) {
      try { await mesmaPagina.focus(); return; } catch { /* Tenta outra aba. */ }
    }
    for (const aba of abas) {
      if (new URL(aba.url).origin !== destino.origin) continue;
      try {
        await aba.focus();
        const recebeu = await new Promise(resolve => {
          const canal = new MessageChannel();
          const timer = setTimeout(() => { canal.port1.close(); resolve(false); }, 1200);
          canal.port1.onmessage = evento => {
            clearTimeout(timer);
            canal.port1.close();
            resolve(evento.data === 'navegado');
          };
          aba.postMessage({ tipo: 'LABWARE_ABRIR_CHAMADO', caminho: destino.pathname }, [canal.port2]);
        });
        if (recebeu) return;
        const navegada = await aba.navigate(destino.href);
        if (navegada) return;
      } catch { /* A aba pode ter sido fechada; abre outra abaixo. */ }
    }
    await self.clients.openWindow(destino.href);
  })());
});
