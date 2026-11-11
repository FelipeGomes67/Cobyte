import { useEffect, useState } from 'react';
import { obterMeusChamados, readTicketData, subscribeTickets } from '../services/ticketService';

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
          const fallback = readTicketData();
          setData({ ...fallback, loading: false, error: err.message });
        }
      }
    }
    carregar();
    return subscribeTickets(carregar);
  }, []);
  return data;
}
