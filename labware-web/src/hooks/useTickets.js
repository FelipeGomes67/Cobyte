import { useEffect, useState } from 'react';
import { obterMeusChamados } from '../services/ticketService';

export function useTickets() {
  const [data, setData] = useState({ tickets: [], loading: true, error: null });
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const tickets = await obterMeusChamados();
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
  }, []);
  return data;
}
