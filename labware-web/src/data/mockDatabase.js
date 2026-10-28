const STORAGE_KEY = 'labware-tickets';
const PREFERENCES_KEY = 'labware-notification-preferences';
const PASSWORD_KEY = 'labware-demo-password';
const SESSION_KEY = 'labware-session';
const demoCredentials = { email: 'demo@labware.com.br', password: 'Labware123!' };

const currentUser = {
  id: 'user-1',
  name: 'Mariana Costa',
  role: 'Analista de Suporte',
  email: 'mariana.costa@labware.com.br',
};

const initialTickets = [
  { id: 'CH-1048', title: 'Erro ao acessar o painel de análises', category: 'Acesso', priority: 'Alta', status: 'Em andamento', ownerId: 'user-1', createdAt: '2026-10-24T13:20:00.000Z', rating: 4.8, responseMinutes: 18, slaMet: true },
  { id: 'CH-1047', title: 'Integração com sistema de estoque', category: 'Integração', priority: 'Média', status: 'Aberto', ownerId: 'user-2', createdAt: '2026-10-23T10:05:00.000Z' },
  { id: 'CH-1046', title: 'Lentidão na sincronização de pedidos', category: 'Indisponibilidade', priority: 'Urgente', status: 'Em andamento', ownerId: 'user-1', createdAt: '2026-10-21T15:40:00.000Z', responseMinutes: 32, slaMet: false },
  { id: 'CH-1045', title: 'Dúvida sobre permissões de usuário', category: 'Dúvida', priority: 'Baixa', status: 'Resolvido', ownerId: 'user-3', createdAt: '2026-10-19T09:15:00.000Z', rating: 4.5, responseMinutes: 24, slaMet: true },
  { id: 'CH-1044', title: 'Atualização de credenciais da API', category: 'Segurança', priority: 'Crítica', status: 'Resolvido', ownerId: 'user-1', createdAt: '2026-10-16T11:30:00.000Z', rating: 5, responseMinutes: 12, slaMet: true },
  { id: 'CH-1043', title: 'Relatório mensal não carrega', category: 'Indisponibilidade', priority: 'Alta', status: 'Aberto', ownerId: 'user-2', createdAt: '2026-10-12T14:10:00.000Z' },
  { id: 'CH-1042', title: 'Configuração de integração fiscal', category: 'Integração', priority: 'Média', status: 'Resolvido', ownerId: 'user-1', createdAt: '2026-10-08T08:45:00.000Z', rating: 4.2, responseMinutes: 28, slaMet: true },
  { id: 'CH-1041', title: 'Solicitação de novo acesso', category: 'Acesso', priority: 'Baixa', status: 'Resolvido', ownerId: 'user-3', createdAt: '2026-10-02T16:00:00.000Z', rating: 4.7, responseMinutes: 20, slaMet: true },
];

function readTickets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore invalid or unavailable local storage and use the demo data.
  }
  return [...initialTickets];
}

export function getCurrentUser() {
  return currentUser;
}

export function signIn(email, password) {
  if (typeof localStorage === 'undefined') return false;
  const savedPassword = localStorage.getItem(PASSWORD_KEY) || demoCredentials.password;
  if (email !== demoCredentials.email || password !== savedPassword) return false;
  localStorage.setItem(SESSION_KEY, 'signed-in');
  return true;
}

export function signOut() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

export function getNotificationPreferences() {
  const defaults = { assigned: true, critical: true, sla: true, reply: true, browserEnabled: false };
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY));
    return stored && typeof stored === 'object' ? { ...defaults, ...stored } : defaults;
  } catch {
    return defaults;
  }
}

export function saveNotificationPreferences(preferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences remain available to the current page when storage is disabled.
  }
}

export function updatePassword(currentPassword, newPassword) {
  if (typeof localStorage === 'undefined') return false;
  const savedPassword = localStorage.getItem(PASSWORD_KEY) || demoCredentials.password;
  if (currentPassword !== savedPassword || typeof newPassword !== 'string' || newPassword.length < 8) return false;
  localStorage.setItem(PASSWORD_KEY, newPassword);
  return true;
}

export function getTickets() {
  return readTickets();
}

export function createTicket({ title, category, description, priority }) {
  const tickets = readTickets();
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
    ownerId: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  const updated = [ticket, ...tickets];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Keep the newly created ticket available for this session if storage is disabled.
  }
  return ticket;
}

export function getReportTrend() {
  const tickets = getTickets();
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthTickets = tickets.filter(ticket => {
      const date = new Date(ticket.createdAt);
      return date.getFullYear() === year && date.getMonth() === month;
    });
    return {
      month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      opened: monthTickets.length,
      resolved: monthTickets.filter(ticket => ticket.status === 'Resolvido').length,
    };
  });
}
