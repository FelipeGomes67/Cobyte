import { useAutenticacao } from './useAuth';
import { useEffect, useState } from 'react';
import { obterMeusChamados, obterChamadosDaEmpresa } from '../services/ticketService';

export function useTickets(escopo = 'pessoal') {
  const { usuario } = useAutenticacao();
  const [data, setData] = useState({ tickets: [], loading: true, error: null });
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const tickets = escopo === 'empresa' && usuario?.perfil === 'CLIENTE'
          ? (usuario.empresaId ? await obterChamadosDaEmpresa(usuario.empresaId) : [])
          : await obterMeusChamados();
        if (ativo) {
          setData({ tickets, loading: false, error: null });
        }
      } catch (err) {
        if (ativo) {
          setData({ tickets: [], loading: false, error: err.message });
        }
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [escopo, usuario?.id, usuario?.perfil, usuario?.empresaId]);
  return data;
}
