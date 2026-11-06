import { useEffect, useState } from 'react';
import { readTicketData, subscribeTickets } from '../services/ticketService';

export function useTickets() {
  const [data, setData] = useState({ tickets: [], loading: true, error: null });
  useEffect(() => {
    const refresh = () => setData({ ...readTicketData(), loading: false });
    refresh();
    return subscribeTickets(refresh);
  }, []);
  return data;
}
