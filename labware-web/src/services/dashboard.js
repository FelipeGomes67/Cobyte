import { STATUS_VISUAL, PRIORIDADE_VISUAL, obterVisualChamado } from '../utils/chamadoVisual';
export const STATUS_DASHBOARD = Object.entries(STATUS_VISUAL)
  .map(([chave, visual]) => ({ chave, ...visual }));

function normalizar(valor = '') {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, '_');
}

export function obterStatus(chamado) {
  const chave = normalizar(chamado.status).replace('AGUARDANDO_CLIENTE', 'AGUARDANDO_SOLICITANTE');
  const equivalente = chave === 'EM_ANDAMENTO' ? 'EM_ATENDIMENTO' : chave;
  return STATUS_DASHBOARD.find(status => status.chave === equivalente)
    || { chave: equivalente, nome: chamado.status || 'Não informado', cor: '#94a3b8' };
}

function obterData(valor) {
  if (!valor) return null;
  const data = new Date(valor).getTime();
  return Number.isFinite(data) ? data : null;
}

export function obterRestanteSla(chamado, agora) {
  const prazo = obterData(chamado.slaDueAt);
  return prazo === null ? null : prazo - agora;
}

export function formatarDuracao(minutos) {
  if (minutos === null || !Number.isFinite(minutos)) return '—';
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) return `${total}min`;
  return `${Math.floor(total / 60)}h${total % 60 ? ` ${total % 60}min` : ''}`;
}

export function formatarRestanteSla(milissegundos) {
  if (milissegundos === null) return 'Não definido';
  const segundos = Math.floor(Math.abs(milissegundos) / 1000);
  return `${milissegundos < 0 ? '-' : ''}${String(Math.floor(segundos / 3600)).padStart(2, '0')}:${String(Math.floor(segundos / 60) % 60).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}

export function obterDuracaoSla(chamado) {
  const inicio = obterData(chamado.createdAt);
  const fim = obterData(chamado.slaDueAt);
  return inicio !== null && fim !== null && fim >= inicio ? formatarDuracao((fim - inicio) / 60000) : null;
}

function media(valores) {
  return valores.length ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length : null;
}

function chaveDia(data) {
  return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

export function calcularDashboard(chamados, agora) {
  const finalizado = chamado => ['RESOLVIDO', 'FECHADO'].includes(obterStatus(chamado).chave);
  const ativos = chamados.filter(chamado => !finalizado(chamado) && obterStatus(chamado).chave !== 'CANCELADO');
  const resolvidos = chamados.filter(finalizado);
  const emRisco = ativos.filter(chamado => {
    const restante = obterRestanteSla(chamado, agora);
    return restante !== null && restante < 3600000;
  });
  const criticos = ativos.filter(chamado => normalizar(chamado.priority) === 'CRITICA');
  const prioridades = Object.entries(PRIORIDADE_VISUAL)
    .map(([chave, visual]) => ({ chave, ...visual }));
  const status = STATUS_DASHBOARD.map(item => ({ ...item, quantidade: 0 }));
  const categorias = ['Acesso', 'Integração', 'Indisponibilidade', 'Dúvida', 'Segurança', 'Outros']
    .map(nome => ({ nome, cor: '#3b82f6', quantidade: 0 }));

  // Valores adicionais da base também entram nas legendas e nos totais.
  chamados.forEach(chamado => {
    const situacao = obterStatus(chamado);
    let itemStatus = status.find(item => item.chave === situacao.chave);
    if (!itemStatus) { itemStatus = { ...situacao, quantidade: 0 }; status.push(itemStatus); }
    itemStatus.quantidade++;
    const chavePrioridade = normalizar(chamado.priority);
    if (!prioridades.some(item => item.chave === chavePrioridade)) {
      prioridades.push({ chave: chavePrioridade, nome: chamado.priority || 'Não informada', cor: obterVisualChamado(chamado.priority, 'prioridade').cor });
    }
    const nomeCategoria = chamado.category || 'Outros';
    let categoria = categorias.find(item => item.nome === nomeCategoria);
    if (!categoria) { categoria = { nome: nomeCategoria, cor: '#3b82f6', quantidade: 0 }; categorias.push(categoria); }
    categoria.quantidade++;
  });

  const comSlaConcluido = resolvidos.filter(chamado => obterData(chamado.resolvedAt) !== null && obterData(chamado.slaDueAt) !== null);
  const noPrazo = comSlaConcluido.filter(chamado => obterData(chamado.resolvedAt) <= obterData(chamado.slaDueAt));
  const temposResolucao = resolvidos.flatMap(chamado => {
    const inicio = obterData(chamado.createdAt);
    const fim = obterData(chamado.resolvedAt);
    return inicio !== null && fim !== null && fim >= inicio ? [(fim - inicio) / 60000] : [];
  });
  const temposResposta = chamados.map(chamado => chamado.firstResponseMinutes).filter(valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0);
  const prioritarios = ativos.filter(chamado => criticos.includes(chamado) || emRisco.includes(chamado) || normalizar(chamado.priority) === 'URGENTE')
    .sort((a, b) => (obterRestanteSla(a, agora) ?? Infinity) - (obterRestanteSla(b, agora) ?? Infinity));
  const evolucao = Array.from({ length: 30 }, (_, indice) => {
    const data = new Date(agora);
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() - 29 + indice);
    const chave = chaveDia(data);
    return {
      chave,
      data: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      abertos: chamados.filter(chamado => obterData(chamado.createdAt) !== null && chaveDia(new Date(chamado.createdAt)) === chave).length,
      fechados: resolvidos.filter(chamado => obterData(chamado.resolvedAt) !== null && chaveDia(new Date(chamado.resolvedAt)) === chave).length,
    };
  });

  return {
    total: chamados.length, ativos: ativos.length, resolvidos: resolvidos.length,
    emRisco: emRisco.length, criticos: criticos.length, status, categorias, prioritarios, evolucao,
    prioridades: prioridades.map(item => ({ ...item, quantidade: chamados.filter(chamado => normalizar(chamado.priority) === item.chave).length })),
    cumprimentoSla: comSlaConcluido.length ? noPrazo.length / comSlaConcluido.length * 100 : null,
    tempoResolucao: media(temposResolucao), tempoResposta: media(temposResposta),
  };
}
