import { DEMO_TICKETS } from '../data/demoTickets';

const STORAGE_KEY = 'labware-tickets';
const CHANGE_EVENT = 'labware:tickets-changed';

function markLegacySource(ticket) {
  const id = Number(String(ticket.id).replace(/^CH-/, ''));
  const source = ticket.source || (Number.isFinite(id) && id >= 1041 && id <= 1048 ? 'demo' : 'local');
  const demoRecord = DEMO_TICKETS.find(candidate => candidate.id === ticket.id);
  return {
    ...ticket,
    source,
    // Legacy demo rows get their demo-only semantics from the separate fixture file.
    ...(source === 'demo' && demoRecord ? {
      firstResponseMinutes: ticket.firstResponseMinutes ?? ticket.responseMinutes ?? demoRecord.firstResponseMinutes,
      resolvedAt: ticket.resolvedAt ?? demoRecord.resolvedAt,
      slaDueAt: ticket.slaDueAt ?? demoRecord.slaDueAt,
    } : {}),
  };
}

export function readTicketData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const tickets = JSON.parse(stored);
      if (Array.isArray(tickets)) return { tickets: tickets.map(markLegacySource), error: null };
      return { tickets: DEMO_TICKETS, error: 'O armazenamento local contém um formato inválido. Exibindo os dados de demonstração.' };
    }
  } catch {
    return { tickets: DEMO_TICKETS, error: 'Não foi possível ler os chamados salvos. Exibindo os dados de demonstração.' };
  }
  return { tickets: DEMO_TICKETS, error: null };
}

export function getTickets() {
  return readTicketData().tickets;
}

export function subscribeTickets(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function persist(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function createTicket({ title, category, description, priority, ownerId }) {
  const tickets = getTickets();
  const sequence = tickets.reduce((max, ticket) => {
    const number = Number(String(ticket.id).replace(/^CH-/, ''));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 1040) + 1;
  const ticket = {
    id: `CH-${sequence}`,
    title,
    category,
    description,
    priority,
    status: 'Aberto',
    ownerId,
    createdAt: new Date().toISOString(),
    source: 'local',
  };
  persist([ticket, ...tickets]);
  return ticket;
}
