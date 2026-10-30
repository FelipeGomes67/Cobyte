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

export function getPendingCount(opened, resolved) {
  const safeOpened = Number.isFinite(opened) ? opened : 0;
  const safeResolved = Number.isFinite(resolved) ? resolved : 0;
  return Math.max(0, safeOpened - safeResolved);
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
  const { year } = getCalendarParts(now);
  return [year, year - 1];
}

function getCalendarParts(value) {
  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) return { year: Number(dateOnly[1]), month: Number(dateOnly[2]) - 1 };
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return { year: 0, month: 0 };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value) - 1,
  };
}

export function getMonthlyTrend(tickets, now = new Date(), selectedYear = null) {
  const currentDate = getCalendarParts(now);
  const year = selectedYear ?? currentDate.year;
  const firstMonthKey = year * 12;
  const lastAvailableMonth = year === currentDate.year ? currentDate.month : 11;
  const lastMonthKey = firstMonthKey + lastAvailableMonth;
  const counts = new Map();

  (Array.isArray(tickets) ? tickets : []).forEach(ticket => {
    const createdAt = ticket.createdAt ? getCalendarParts(ticket.createdAt) : null;
    if (createdAt?.year) {
      const monthKey = createdAt.year * 12 + createdAt.month;
      if (monthKey >= firstMonthKey && monthKey <= lastMonthKey) {
        const monthCounts = counts.get(monthKey) || { opened: 0, resolved: 0 };
        monthCounts.opened += 1;
        counts.set(monthKey, monthCounts);
      }
    }

    const resolvedAt = ticket.status === 'Resolvido' && ticket.resolvedAt
      ? getCalendarParts(ticket.resolvedAt)
      : null;
    if (resolvedAt?.year) {
      const monthKey = resolvedAt.year * 12 + resolvedAt.month;
      if (monthKey >= firstMonthKey && monthKey <= lastMonthKey) {
        const monthCounts = counts.get(monthKey) || { opened: 0, resolved: 0 };
        monthCounts.resolved += 1;
        counts.set(monthKey, monthCounts);
      }
    }
  });

  return Array.from({ length: 12 }, (_, index) => {
    const available = index <= lastAvailableMonth;
    const monthCounts = available
      ? counts.get(firstMonthKey + index) || { opened: 0, resolved: 0 }
      : { opened: null, resolved: null };
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, index, 1)))
      .replace(/\.$/, '');
    return {
      month,
      year,
      available,
      pending: available ? getPendingCount(monthCounts.opened, monthCounts.resolved) : null,
      ...monthCounts,
    };
  });
}