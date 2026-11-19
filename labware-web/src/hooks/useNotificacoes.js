import { useEffect, useState } from 'react';
import { consultarNotificacoes, EVENTO_NOTIFICACOES } from '../services/notificacaoService';
import { useAutenticacao } from './useAuth';
export function useNotificacoes(page = 0, size = 20, filtro = 'todas') {
  const { usuario } = useAutenticacao();
  const chave = [usuario?.id, usuario?.perfil, usuario?.empresaId, page, size, filtro].join(':');
  const [estado, setEstado] = useState({ content: [], naoLidas: 0, totalPages: 0, carregando: true, erro: '' });
  useEffect(() => {
    if (!usuario?.id) return;
    let ativo = true, pedido = 0;
    async function atualizar() {
      const atual = ++pedido;
      try {
        const dados = await consultarNotificacoes(page, size, filtro);
        if (ativo && atual === pedido) setEstado({ ...dados, chave, carregando: false, erro: '' });
      } catch {
        if (ativo && atual === pedido) setEstado(prev => ({ ...(prev.chave === chave ? prev : { content: [], naoLidas: 0, totalPages: 0 }), chave, carregando: false, erro: 'Não foi possível carregar as notificações.' }));
      }
    }
    function leituraAtualizada(evento) {
      if (evento.detail && Object.hasOwn(evento.detail, 'id')) {
        setEstado(prev => {
          if (prev.chave !== chave) return prev;
          const id = evento.detail.id;
          const todos = id == null;
          const conhecida = prev.content.find(item => String(item.id) === String(id));
          const content = prev.content.map(item => todos || String(item.id) === String(id) ? { ...item, lida: true } : item);
          return {
            ...prev,
            content: filtro === 'nao-lidas' ? content.filter(item => !item.lida) : content,
            naoLidas: todos ? 0 : Math.max(0, prev.naoLidas - (conhecida && !conhecida.lida ? 1 : 0)),
          };
        });
      }
      atualizar();
    }
    function atualizarVisivel() { if (!document.hidden) atualizar(); }
    atualizar();
    const timer = setInterval(() => { if (!document.hidden) atualizar(); }, 30000);
    window.addEventListener(EVENTO_NOTIFICACOES, leituraAtualizada);
    document.addEventListener('visibilitychange', atualizarVisivel);
    window.addEventListener('focus', atualizar);
    return () => { ativo = false; clearInterval(timer); window.removeEventListener(EVENTO_NOTIFICACOES, leituraAtualizada); document.removeEventListener('visibilitychange', atualizarVisivel); window.removeEventListener('focus', atualizar); };
  }, [page, size, usuario?.id, usuario?.perfil, usuario?.empresaId, filtro, chave]);
  return estado.chave === chave ? estado : { content: [], naoLidas: 0, totalPages: 0, carregando: true, erro: '' };
}
