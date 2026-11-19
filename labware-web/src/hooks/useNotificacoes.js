import { useEffect, useState } from 'react';
import { consultarNotificacoes, EVENTO_NOTIFICACOES } from '../services/notificacaoService';
import { useAutenticacao } from './useAuth';
export function useNotificacoes(page = 0, size = 20, filtro = 'todas') {
  const { usuario } = useAutenticacao();
  const chave = [usuario?.id, page, size, filtro].join(':');
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
    atualizar();
    const timer = setInterval(() => { if (!document.hidden) atualizar(); }, 30000);
    window.addEventListener(EVENTO_NOTIFICACOES, atualizar);
    window.addEventListener('focus', atualizar);
    return () => { ativo = false; clearInterval(timer); window.removeEventListener(EVENTO_NOTIFICACOES, atualizar); window.removeEventListener('focus', atualizar); };
  }, [page, size, usuario?.id, filtro, chave]);
  return estado.chave === chave ? estado : { content: [], naoLidas: 0, totalPages: 0, carregando: true, erro: '' };
}
