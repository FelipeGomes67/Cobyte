import { useAutenticacao } from './useAuth';
import { useEffect, useState } from 'react';
import { obterMeusChamados, obterChamadosDaEmpresa } from '../services/ticketService';

export function useTickets(escopo = 'pessoal', tentativa = 0) {
  const { usuario } = useAutenticacao();
  const chave = [usuario?.id, usuario?.perfil, usuario?.empresaId, escopo].join(':');
  const [data, setData] = useState({ chave: '', tickets: [], loading: true, error: null });
  useEffect(() => {
    if (!usuario?.id) return;
    let ativo = true, consultando = false;
    async function carregar() {
      if (consultando) return;
      consultando = true;
      try {
        const tickets = escopo === 'empresa' && usuario.perfil === 'CLIENTE'
          ? (usuario.empresaId ? await obterChamadosDaEmpresa(usuario.empresaId) : [])
          : await obterMeusChamados();
        if (ativo) setData({ chave, tickets, loading: false, error: null });
      } catch (err) {
        if (ativo) setData(anterior => ({
          chave, tickets: anterior.chave === chave ? anterior.tickets : [],
          loading: false, error: err.message || 'Não foi possível atualizar os chamados.',
        }));
      } finally { consultando = false; }
    }
    function atualizarVisivel() { if (!document.hidden) carregar(); }
    carregar();
    const intervalo = setInterval(atualizarVisivel, 30000);
    window.addEventListener('focus', atualizarVisivel);
    document.addEventListener('visibilitychange', atualizarVisivel);
    window.addEventListener('cobyte-chamados-atualizados', atualizarVisivel);
    return () => {
      ativo = false; clearInterval(intervalo);
      window.removeEventListener('focus', atualizarVisivel);
      document.removeEventListener('visibilitychange', atualizarVisivel);
      window.removeEventListener('cobyte-chamados-atualizados', atualizarVisivel);
    };
  }, [escopo, tentativa, usuario?.id, usuario?.perfil, usuario?.empresaId, chave]);
  return data.chave === chave ? data : { tickets: [], loading: true, error: null };
}
