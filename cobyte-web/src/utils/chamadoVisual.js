// Paleta unica para badges, legendas e graficos de chamados.
export const STATUS_VISUAL = {
  ABERTO: { nome: 'Aberto', cor: '#1e40af', fundo: '#dbeafe' },
  EM_ANALISE: { nome: 'Em análise', cor: '#581c87', fundo: '#f3e8ff' },
  EM_ATENDIMENTO: { nome: 'Em atendimento', cor: '#9a3412', fundo: '#ffedd5' },
  AGUARDANDO_SOLICITANTE: { nome: 'Aguardando solicitante', cor: '#713f12', fundo: '#fef08a' },
  RESOLVIDO: { nome: 'Resolvido', cor: '#166534', fundo: '#dcfce7' },
  FECHADO: { nome: 'Fechado', cor: '#374151', fundo: '#d1d5db' },
  CANCELADO: { nome: 'Cancelado', cor: '#9d174d', fundo: '#fce7f3' },
};

export const PRIORIDADE_VISUAL = {
  CRITICA: { nome: 'Crítica', cor: '#991b1b', fundo: '#fecaca' },
  ALTA: { nome: 'Alta', cor: '#9a3412', fundo: '#fed7aa' },
  MEDIA: { nome: 'Média', cor: '#713f12', fundo: '#fef08a' },
  BAIXA: { nome: 'Baixa', cor: '#075985', fundo: '#e0f2fe' },
  MELHORIA: { nome: 'Melhoria', cor: '#581c87', fundo: '#f3e8ff' },
};

export function normalizarCodigo(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toUpperCase().replace(/\s+/g, '_');
}

export function obterVisualChamado(valor, tipo = 'status') {
  let chave = normalizarCodigo(valor);
  if (tipo === 'status') {
    if (chave === 'EM_ANDAMENTO') chave = 'EM_ATENDIMENTO';
    if (chave === 'AGUARDANDO_CLIENTE') chave = 'AGUARDANDO_SOLICITANTE';
  } else if (chave === 'NAO_APLICAVEL') return { nome: 'Não aplicável', cor: '#475569', fundo: '#f1f5f9' };
  else if (chave === 'URGENTE') chave = 'ALTA';
  const paleta = tipo === 'prioridade' ? PRIORIDADE_VISUAL : STATUS_VISUAL;
  return paleta[chave] || {
    nome: valor || (tipo === 'prioridade' ? 'Sem prioridade' : 'Não informado'),
    cor: '#475569', fundo: '#f1f5f9',
  };
}
