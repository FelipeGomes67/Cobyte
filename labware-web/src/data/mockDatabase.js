const STORAGE_KEY = 'labware-tickets';
const PREFERENCES_KEY = 'labware-notification-preferences';
const PASSWORD_KEY = 'labware-demo-password';
const SESSION_KEY = 'labware-session';
const demoCredentials = { email: 'demo@labware.com.br', password: 'Labware123!' };

const currentUser = { 
  id: 'user-1',
  name: 'Mariana Costa',
  cargo: 'Analista de Suporte',
  email: 'mariana.costa@labware.com.br',
  tel: '(11) 4225-2000',
};

const initialTickets = [
  { 
    id: 'CH-1048', 
    codigo: '#LAB-2026-01048',
    title: 'Pelo amor de Deus, o sistema caiu inteiro. Tô com 500 amostras pra rodar e tá dando time-out no banco de dados.',
    description: 'O sistema está indisponível e apresenta time-out no banco de dados, impedindo o processamento de 500 amostras.',
    category: 'Indisponibilidade',
    categoria: 'Pendente',
    priority: 'Alta',
    prioridade: 'ALTA',
    status: 'Aberto',
    sistema: 'LABWARE',
    solicitante: 'Ronaldo',
    empresa: 'Ruffles',
    equipamento: 'Não informado',
    createdAt: '2026-10-27T11:34:00.000Z',
    data: '27/10/2026 11:34',
    sla: '12h',
    tempoRestante: '11:58:23',
    responsavel: 'Lucas Ribeiro',
    ownerId: 'user-1',
    rating: 4.8, 
    responseMinutes: 18, 
    slaMet: true,
    mensagens: [
      {
        id: 1,
        autor: 'Lucas Ribeiro',
        data: '27/10/2026 11:39',
        cargo: 'SUPORTE',
        texto: 'Olá, a equipe de infraestrutura já está verificando as conexões do servidor de banco de dados.'
      }
    ],
    evidencias: [
      { nome: 'Captura de tela 2026-10-27 101245.png', tipo: 'PNG' }
    ]
  },
  { 
    id: 'CH-1047', 
    codigo: '#LAB-2026-01047',
    title: 'Integração com sistema de estoque', 
    description: 'Falha na sincronização dos insumos de reagentes com o módulo de estoque central.',
    category: 'Integração', 
    categoria: 'Integração',
    priority: 'Média', 
    prioridade: 'MÉDIA',
    status: 'Aberto', 
    sistema: 'LABWARE',
    solicitante: 'Carlos Eduardo',
    empresa: 'Labware Central',
    equipamento: 'Servidor ERP',
    createdAt: '2026-10-23T10:05:00.000Z',
    data: '23/10/2026 10:05',
    sla: '24h',
    tempoRestante: '18:30:00',
    responsavel: 'Ana Souza',
    ownerId: 'user-2',
    mensagens: [],
    evidencias: []
  },
  { 
    id: 'CH-1046', 
    codigo: '#LAB-2026-01046',
    title: 'SLA Excedido: Scanner não lê código de barras', 
    description: 'O leitor óptico da bancada 2 parou de responder durante a bipagem dos tubos de ensaio, ultrapassando o tempo limite.',
    category: 'Indisponibilidade', 
    categoria: 'Hardware',
    priority: 'Urgente', 
    prioridade: 'ALTA',
    status: 'Em andamento', 
    sistema: 'LABWARE',
    solicitante: 'Mariana Costa',
    empresa: 'Labware Central',
    equipamento: 'Scanner Zebra DS2208',
    createdAt: '2026-10-21T15:40:00.000Z',
    data: '21/10/2026 15:40',
    sla: '12h',
    tempoRestante: '00:00:00',
    responsavel: 'Lucas Ribeiro',
    ownerId: 'user-1', 
    responseMinutes: 32, 
    slaMet: false,
    mensagens: [
      {
        id: 1,
        autor: 'Lucas Ribeiro',
        data: '21/10/2026 16:00',
        cargo: 'SUPORTE',
        texto: 'A equipe técnica já foi acionada para substituir o leitor da bancada.'
      }
    ],
    evidencias: [
      { nome: 'foto_scanner_erro.png', tipo: 'PNG' }
    ]
  },
  { 
    id: 'CH-1045', 
    codigo: '#LAB-2026-01045',
    title: 'Dúvida sobre permissões de usuário', 
    description: 'Solicitação de esclarecimento sobre as permissões do perfil de técnico de laboratório no módulo de exames.',
    category: 'Dúvida', 
    categoria: 'Acesso',
    priority: 'Baixa', 
    prioridade: 'BAIXA',
    status: 'Resolvido', 
    sistema: 'LABWARE',
    solicitante: 'Fernanda Lima',
    empresa: 'Ruffles',
    equipamento: 'Não informado',
    createdAt: '2026-10-19T09:15:00.000Z',
    data: '19/10/2026 09:15',
    sla: '48h',
    tempoRestante: '00:00:00',
    responsavel: 'Mariana Costa',
    ownerId: 'user-3', 
    rating: 4.5, 
    responseMinutes: 24, 
    slaMet: true,
    mensagens: [
      {
        id: 1,
        autor: 'Mariana Costa',
        data: '19/10/2026 09:39',
        cargo: 'SUPORTE',
        texto: 'Documentação de permissões enviada por e-mail.'
      }
    ],
    evidencias: []
  },
  { 
    id: 'CH-1044', 
    codigo: '#LAB-2026-01044',
    title: 'Atualização de credenciais da API', 
    description: 'Renovação obrigatória dos tokens de segurança da API de integração com os laboratórios parceiros.',
    category: 'Segurança', 
    categoria: 'Segurança',
    priority: 'Crítica', 
    prioridade: 'CRÍTICA',
    status: 'Resolvido', 
    sistema: 'LABWARE',
    solicitante: 'Roberto Silva',
    empresa: 'Labware Central',
    equipamento: 'Servidor API',
    createdAt: '2026-10-16T11:30:00.000Z',
    data: '16/10/2026 11:30',
    sla: '4h',
    tempoRestante: '00:00:00',
    responsavel: 'Mariana Costa',
    ownerId: 'user-1', 
    rating: 5, 
    responseMinutes: 12, 
    slaMet: true,
    mensagens: [],
    evidencias: []
  },
  { 
    id: 'CH-1043', 
    codigo: '#LAB-2026-01043',
    title: 'Relatório mensal não carrega', 
    description: 'Erro 500 gerado ao tentar exportar a visão consolidada de amostras processadas no mês.',
    category: 'Indisponibilidade', 
    categoria: 'Relatórios',
    priority: 'Alta', 
    prioridade: 'ALTA',
    status: 'Aberto', 
    sistema: 'LABWARE',
    solicitante: 'Juliana Mendes',
    empresa: 'Ruffles',
    equipamento: 'Não informado',
    createdAt: '2026-10-12T14:10:00.000Z',
    data: '12/10/2026 14:10',
    sla: '12h',
    tempoRestante: '02:15:00',
    responsavel: 'Não atribuído',
    ownerId: 'user-2',
    mensagens: [],
    evidencias: []
  },
  { 
    id: 'CH-1042', 
    codigo: '#LAB-2026-01042',
    title: 'Configuração de integração fiscal', 
    description: 'Ajuste de webservice para homologação de Notas Fiscais de Serviço.',
    category: 'Integração', 
    categoria: 'Fiscal',
    priority: 'Média', 
    prioridade: 'MÉDIA',
    status: 'Resolvido', 
    sistema: 'LABWARE',
    solicitante: 'Mariana Costa',
    empresa: 'Labware Central',
    equipamento: 'Módulo Fiscal',
    createdAt: '2026-10-08T08:45:00.000Z',
    data: '08/10/2026 08:45',
    sla: '24h',
    tempoRestante: '00:00:00',
    responsavel: 'Mariana Costa',
    ownerId: 'user-1', 
    rating: 4.2, 
    responseMinutes: 28, 
    slaMet: true,
    mensagens: [],
    evidencias: []
  },
  { 
    id: 'CH-1041', 
    codigo: '#LAB-2026-01041',
    title: 'Solicitação de novo acesso', 
    description: 'Criação de usuário e perfil de acesso para novo colaborador do setor de triagem.',
    category: 'Acesso', 
    categoria: 'Acesso',
    priority: 'Baixa', 
    prioridade: 'BAIXA',
    status: 'Resolvido', 
    sistema: 'LABWARE',
    solicitante: 'Marcos Paulo',
    empresa: 'Ruffles',
    equipamento: 'Não informado',
    createdAt: '2026-10-02T16:00:00.000Z',
    data: '02/10/2026 16:00',
    sla: '48h',
    tempoRestante: '00:00:00',
    responsavel: 'Ana Souza',
    ownerId: 'user-3', 
    rating: 4.7, 
    responseMinutes: 20, 
    slaMet: true,
    mensagens: [],
    evidencias: []
  },
];

function readTickets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
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
  } catch {}
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

export function getTicketById(id) {
  const tickets = readTickets();
  if (!id) return tickets[0];
  
  const cleanId = String(id).replace(/^(CH-|\#LAB-2026-|\#)/i, '');
  return tickets.find(ticket => {
    const ticketCleanId = String(ticket.id).replace(/^CH-/, '');
    return ticket.id === id || ticketCleanId === cleanId;
  }) || tickets[0];
}

export function createTicket({ title, category, description, priority, equipamento }) {
  const tickets = readTickets();
  const sequence = tickets.reduce((max, ticket) => {
    const number = Number(String(ticket.id).replace(/^CH-/, ''));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 1040) + 1;

  const now = new Date();
  const dateFormatted = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const ticket = {
    id: `CH-${sequence}`,
    codigo: `#LAB-2026-0${sequence}`,
    title,
    description: description || 'Sem descrição informada.',
    category,
    categoria: category || 'Pendente',
    priority: priority || 'Média',
    prioridade: (priority || 'MÉDIA').toUpperCase(),
    status: 'Aberto',
    sistema: 'LABWARE',
    solicitante: currentUser.name,
    empresa: 'Labware Central',
    equipamento: equipamento || 'Não informado',
    createdAt: now.toISOString(),
    data: dateFormatted,
    sla: '12h',
    tempoRestante: '11:59:59',
    responsavel: 'Não atribuído',
    ownerId: currentUser.id,
    mensagens: [],
    evidencias: [],
  };

  const updated = [ticket, ...tickets];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return ticket;
}

export function addMessageToTicket(ticketId, messageText) {
  const tickets = readTickets();
  const cleanId = String(ticketId).replace(/^(CH-|\#LAB-2026-|\#)/i, '');
  
  const ticketIndex = tickets.findIndex(t => t.id === ticketId || String(t.id).replace(/^CH-/, '') === cleanId);
  if (ticketIndex === -1) return null;

  const now = new Date();
  const dateFormatted = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const novaMensagem = {
    id: Date.now(),
    autor: currentUser.name,
    data: dateFormatted,
    cargo: 'SUPORTE',
    texto: messageText,
  };

  tickets[ticketIndex].mensagens = tickets[ticketIndex].mensagens || [];
  tickets[ticketIndex].mensagens.push(novaMensagem);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {}

  return tickets[ticketIndex];
}

export function updateTicketStatus(ticketId, newStatus) {
  const tickets = readTickets();
  const cleanId = String(ticketId).replace(/^(CH-|\#LAB-2026-|\#)/i, '');
  
  const index = tickets.findIndex(t => t.id === ticketId || String(t.id).replace(/^CH-/, '') === cleanId);
  if (index !== -1) {
    tickets[index].status = newStatus;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch {}
    return tickets[index];
  }
  return null;
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