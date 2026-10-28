export const REPORT_CATEGORIES = ['Indisponibilidade', 'Integração', 'Acesso', 'Dúvida', 'Segurança', 'Outros'];
export const REPORT_PRIORITIES = [
  { name: 'Crítica', color: '#ef4444' },
  { name: 'Urgente', color: '#f97316' },
  { name: 'Alta', color: '#f3a20a' },
  { name: 'Média', color: '#3478f6' },
  { name: 'Baixa', color: '#9aa9bd' },
];

export function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
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
  return {
    rating: average(ratings),
    ratingCount: ratings.length,
    firstResponseMinutes: average(firstResponses),
    firstResponseCount: firstResponses.length,
    slaPercent: slaEvaluated.length ? Math.round((slaMet.length / slaEvaluated.length) * 100) : null,
    slaCount: slaEvaluated.length,
    categories: REPORT_CATEGORIES.map(name => ({ name, count: tickets.filter(ticket => ticket.category === name).length })),
    priorities: REPORT_PRIORITIES.map(priority => ({ ...priority, count: tickets.filter(ticket => ticket.priority === priority.name).length })),
  };
}

export function getMonthlyTrend(tickets, now = new Date()) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const opened = tickets.filter(ticket => {
      const createdAt = new Date(ticket.createdAt);
      return createdAt.getFullYear() === year && createdAt.getMonth() === month;
    }).length;
    const resolved = tickets.filter(ticket => {
      if (ticket.status !== 'Resolvido' || !ticket.resolvedAt) return false;
      const resolvedAt = new Date(ticket.resolvedAt);
      return resolvedAt.getFullYear() === year && resolvedAt.getMonth() === month;
    }).length;
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      year,
      opened,
      resolved,
    };
  });
}
