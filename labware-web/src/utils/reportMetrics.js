export const REPORT_CATEGORIES = ['Indisponibilidade', 'Integração', 'Acesso', 'Dúvida', 'Segurança', 'Outros'];
export const REPORT_PRIORITIES = [
  { name: 'Crítica', color: '#dc3545' },
  { name: 'Alta', color: '#f97316' },
  { name: 'Média', color: '#3478f6' },
  { name: 'Baixa', color: '#16a34a' },
  { name: 'Sem prioridade', color: '#7b8798' },
  { name: 'Melhoria', color: '#7c3aed' },
];

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isImprovement(ticket) {
  const explicitType = [ticket.type, ticket.ticketType, ticket.requestType, ticket.kind]
    .map(normalize)
    .join(' ');
  const searchableText = [ticket.category, ticket.title, ticket.description]
    .map(normalize)
    .join(' ');
  return /melhoria|reuniao|alinhamento|sugestao/.test(`${explicitType} ${searchableText}`);
}

export function getPriorityGroup(ticket) {
  if (isImprovement(ticket)) return 'Melhoria';
  const priority = normalize(ticket.priority);
  if (priority === 'critica') return 'Crítica';
  // O registro legado permanece intacto; apenas a visualização o agrupa em Alta.
  if (priority === 'alta' || priority === 'urgente') return 'Alta';
  if (priority === 'media') return 'Média';
  if (priority === 'baixa') return 'Baixa';
  return 'Sem prioridade';
}

export function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

// Escala do eixo: começa em zero, usa passos inteiros (1, 2, 5, 10, 20, 50...)
// e termina em um múltiplo do passo >= maior valor. As barras usam o mesmo axisMax.
export function getAxisScale(maxValue, targetIntervals = 4) {
  const safeMax = Math.max(1, Math.ceil(Number.isFinite(maxValue) ? maxValue : 0));
  const rough = Math.max(1, safeMax / targetIntervals);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const base = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = base * magnitude;
  const axisMax = Math.ceil(safeMax / step) * step;
  const ticks = [];
  for (let value = 0; value <= axisMax; value += step) ticks.push(value);
  return { axisMax, step, ticks };
}

export function getReportSummary(tickets) {
  const ratings = tickets.map(ticket => ticket.rating).filter(value => Number.isFinite(value));
  const firstResponses = tickets.map(ticket => ticket.firstResponseMinutes).filter(value => Number.isFinite(value) && value >= 0);
  const slaEvaluated = tickets.filter(ticket => Number.isFinite(Date.parse(ticket.slaDueAt))
    && (ticket.status !== 'Resolvido' || Number.isFinite(Date.parse(ticket.resolvedAt))));
  const slaMet = slaEvaluated.filter(ticket => {
    const completedAt = ticket.resolvedAt || new Date().toISOString();
    return new Date(completedAt) <= new Date(ticket.slaDueAt);
  });
  const categoryNames = new Map(REPORT_CATEGORIES.map(name => [normalize(name), name]));
  const categoryCounts = new Map(REPORT_CATEGORIES.map(name => [name, 0]));
  tickets.forEach(ticket => {
    const category = categoryNames.get(normalize(ticket.category)) || 'Outros';
    categoryCounts.set(category, categoryCounts.get(category) + 1);
  });
  // Cada chamado cai em exatamente um grupo de prioridade (a soma dos grupos = total de chamados).
  const priorityCounts = new Map(REPORT_PRIORITIES.map(priority => [priority.name, 0]));
  tickets.forEach(ticket => {
    const group = getPriorityGroup(ticket);
    priorityCounts.set(group, priorityCounts.get(group) + 1);
  });
  return {
    rating: average(ratings),
    ratingCount: ratings.length,
    firstResponseMinutes: average(firstResponses),
    firstResponseCount: firstResponses.length,
    slaPercent: slaEvaluated.length ? Math.round((slaMet.length / slaEvaluated.length) * 100) : null,
    slaCount: slaEvaluated.length,
    categories: REPORT_CATEGORIES.map(name => ({ name, count: categoryCounts.get(name) })),
    priorities: REPORT_PRIORITIES.map(priority => ({ ...priority, count: priorityCounts.get(priority.name) })),
  };
}

export function getReportYears(now = new Date()) {
  return [now.getFullYear(), now.getFullYear() - 1];
}

export function getMonthlyTrend(tickets, now = new Date(), selectedYear = null) {
  const year = selectedYear ?? now.getFullYear();
  const firstMonth = new Date(year, 0, 1);
  const firstMonthKey = firstMonth.getFullYear() * 12 + firstMonth.getMonth();
  const lastAvailableMonth = year === now.getFullYear() ? now.getMonth() : 11;
  const lastMonthKey = firstMonthKey + lastAvailableMonth;
  const counts = new Map();

  tickets.forEach(ticket => {
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
    if (createdAt && Number.isFinite(createdAt.getTime())) {
      const monthKey = createdAt.getFullYear() * 12 + createdAt.getMonth();
      if (monthKey >= firstMonthKey && monthKey <= lastMonthKey) {
        const monthCounts = counts.get(monthKey) || { opened: 0, resolved: 0, pending: 0 };
        monthCounts.opened += 1;
        if (ticket.status !== 'Resolvido') monthCounts.pending += 1;
        counts.set(monthKey, monthCounts);
      }
    }

    const resolvedAt = ticket.status === 'Resolvido' && ticket.resolvedAt
      ? new Date(ticket.resolvedAt)
      : null;
    if (resolvedAt && Number.isFinite(resolvedAt.getTime())) {
      const monthKey = resolvedAt.getFullYear() * 12 + resolvedAt.getMonth();
      if (monthKey >= firstMonthKey && monthKey <= lastMonthKey) {
        const monthCounts = counts.get(monthKey) || { opened: 0, resolved: 0, pending: 0 };
        monthCounts.resolved += 1;
        counts.set(monthKey, monthCounts);
      }
    }
  });

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, index, 1);
    const available = index <= lastAvailableMonth;
    const monthCounts = available
      ? counts.get(firstMonthKey + index) || { opened: 0, resolved: 0, pending: 0 }
      : { opened: null, resolved: null, pending: null };
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      year,
      available,
      ...monthCounts,
    };
  });
}