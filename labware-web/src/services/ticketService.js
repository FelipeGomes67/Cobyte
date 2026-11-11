import api, { obterToken } from './api.js';
import { DEMO_TICKETS } from '../data/demoTickets';
import { prepararArquivoAudio } from './sttService.js';

const STORAGE_KEY = 'labware-tickets';
const CHANGE_EVENT = 'labware:tickets-changed';

function markLegacySource(ticket) {
  const id = Number(String(ticket.id).replace(/^CH-/, ''));
  const source = ticket.source || (Number.isFinite(id) && id >= 1041 && id <= 1048 ? 'demo' : 'local');
  const demoRecord = DEMO_TICKETS.find(candidate => candidate.id === ticket.id);
  return {
    ...ticket,
    source,
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

export function gerarTituloDeDescricao(descricao) {
  if (!descricao) return 'Abertura de Chamado';
  const primeiraLinha = descricao.trim().split('\n')[0].trim();
  const primeiraFrase = primeiraLinha.split(/[.?!]/)[0].trim();
  const base = primeiraFrase || primeiraLinha || 'Abertura de Chamado';
  return base.length > 80 ? `${base.slice(0, 77)}...` : base;
}

/**
 * Criação real de chamado na labware-api com multipart, anexo obrigatório e triagem por IA
 */
export async function criarChamadoApi({
  titulo,
  descricao,
  origem = 'TEXTO',
  duracaoAudioSegundos = null,
  arquivos = [],
  audio = null,
}) {
  const descricaoFinal = (descricao || '').trim();
  if (!descricaoFinal) {
    throw new Error('A descrição do problema é obrigatória.');
  }

  if (!arquivos || arquivos.length === 0) {
    throw new Error('É obrigatório anexar um arquivo para abrir o chamado.');
  }

  const tituloFinal = (titulo || gerarTituloDeDescricao(descricaoFinal)).trim();
  const formData = new FormData();

  // DTO JSON para @RequestPart("chamado")
  const chamadoPayload = {
    titulo: tituloFinal,
    descricao: descricaoFinal,
    origem: origem === 'VOZ' ? 'VOZ' : 'TEXTO',
    duracaoAudioSegundos: duracaoAudioSegundos ? Number(duracaoAudioSegundos) : null,
  };

  formData.append(
    'chamado',
    new Blob([JSON.stringify(chamadoPayload)], { type: 'application/json' })
  );

  // Campos diretos para compatibilidade com handlers multipart
  formData.append('descricao', descricaoFinal);
  formData.append('titulo', tituloFinal);

  // Arquivos anexos obrigatórios
  arquivos.forEach((file) => {
    formData.append('arquivos', file);
    formData.append('arquivo', file);
  });

  // Áudio original se houver
  if (audio) {
    const audioFinal = await prepararArquivoAudio(audio);
    formData.append('audio', audioFinal, audioFinal.name || 'gravacao.wav');
  }

  const { data } = await api.post('/chamados', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}

export function formatarNomeStatus(status) {
  if (!status) return 'Aberto';
  const normalizado = String(status).toUpperCase();
  switch (normalizado) {
    case 'ABERTO':
      return 'Aberto';
    case 'EM_ATENDIMENTO':
    case 'EM_ANDAMENTO':
    case 'EM_ANALISE':
    case 'AGUARDANDO_CLIENTE':
      return 'Em Andamento';
    case 'RESOLVIDO':
      return 'Resolvido';
    case 'FECHADO':
      return 'Fechado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return status;
  }
}

export function formatarNomePrioridade(prioridade) {
  if (!prioridade) return 'Média';
  const normalizada = String(prioridade).toUpperCase();
  switch (normalizada) {
    case 'CRITICA':
      return 'Crítica';
    case 'ALTA':
      return 'Alta';
    case 'MEDIA':
      return 'Média';
    case 'BAIXA':
      return 'Baixa';
    case 'MELHORIA':
      return 'Melhoria';
    default:
      return prioridade;
  }
}

export function formatarNomeCategoria(categoria) {
  if (!categoria) return 'Dúvida';
  const normalizada = String(categoria).toUpperCase();
  switch (normalizada) {
    case 'INDISPONIBILIDADE':
      return 'Indisponibilidade';
    case 'ERRO_FUNCIONAL':
      return 'Erro Funcional';
    case 'LENTIDAO':
      return 'Lentidão';
    case 'ACESSO':
      return 'Acesso';
    case 'DUVIDA':
      return 'Dúvida';
    case 'MELHORIA':
      return 'Melhoria';
    default:
      return categoria;
  }
}

export function mapearChamadoApi(c) {
  const statusFormatado = formatarNomeStatus(c.status);
  const prioridadeFormatada = formatarNomePrioridade(c.prioridade || c.priority);
  const categoriaFormatada = formatarNomeCategoria(c.categoria || c.category);
  const dataCriacao = c.abertoEm || c.createdAt || new Date().toISOString();

  return {
    id: c.id,
    chamadoId: c.id,
    protocolo: c.protocolo || `#${c.id}`,
    titulo: c.titulo || c.title || 'Chamado sem título',
    title: c.titulo || c.title || 'Chamado sem título',
    descricao: c.descricao || c.description || '',
    description: c.descricao || c.description || '',
    status: statusFormatado,
    statusRaw: c.status,
    prioridade: prioridadeFormatada,
    priority: prioridadeFormatada,
    categoria: categoriaFormatada,
    category: categoriaFormatada,
    dataCriacao,
    createdAt: dataCriacao,
    abertoEm: dataCriacao,
    resolvedAt: c.resolvidoEm || c.resolvedAt || null,
    resolvidoEm: c.resolvidoEm || c.resolvedAt || null,
    solicitanteId: c.solicitanteId ?? (c.solicitante && typeof c.solicitante === 'object' ? c.solicitante.id : null),
    ownerId: c.solicitanteId ?? (c.solicitante && typeof c.solicitante === 'object' ? c.solicitante.id : c.solicitante) ?? c.ownerId,
    solicitante: c.solicitante,
    responsavel: c.responsavel,
    empresa: c.empresa,
  };
}

export async function obterMeusChamados() {
  try {
    const { data } = await api.get('/chamados');
    const rawList = Array.isArray(data)
      ? data
      : (data && Array.isArray(data.content) ? data.content : []);

    return rawList.map(mapearChamadoApi);
  } catch (error) {
    console.warn('Falha ao obter chamados da API, utilizando fallback local:', error?.message);
    const { tickets } = readTicketData();
    return tickets;
  }
}

/** Converte string | { nome, name, ... } em texto exibível (evita renderizar objetos no JSX). */
function textoDe(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor);
  return String(valor.nome ?? valor.name ?? valor.razaoSocial ?? valor.nomeFantasia ?? '');
}

export function formatarSla(minutos) {
  if (minutos === null || minutos === undefined || Number.isNaN(Number(minutos))) return 'Sem SLA';
  const total = Number(minutos);
  if (total % 60 === 0) return `${total / 60}h`;
  return total > 60 ? `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}` : `${total} min`;
}

export function mapearAnexoApi(a, indice) {
  const id = a.id ?? indice;
  const nomeArquivo = a.nomeArquivo || a.nomeOriginal || a.nome || a.filename || a.name || `Anexo ${indice + 1}`;
  const tipoMime = a.tipoConteudo || a.contentType || a.tipo || a.mimeType || 'application/octet-stream';
  const urlDownload = a.downloadUrl || (a.id ? `/api/chamados/anexos/${a.id}/download` : (a.url || ''));

  return {
    id,
    nomeArquivo,
    nome: nomeArquivo,
    tipoMime,
    tipo: tipoMime,
    tamanhoBytes: a.tamanhoBytes ?? a.tamanho ?? a.size ?? null,
    urlDownload,
    url: urlDownload,
    enviadoEm: a.enviadoEm || a.createdAt || null,
  };
}

export function mapearMensagemApi(m, indice) {
  const perfil = String(m.perfil ?? m.autorPerfil ?? m.tipo ?? '').toUpperCase();
  return {
    id: m.id ?? indice,
    autor: textoDe(m.autor ?? m.usuario ?? m.remetente) || 'Usuário',
    texto: m.texto || m.mensagem || m.conteudo || '',
    criadoEm: m.criadoEm || m.enviadoEm || m.createdAt || m.data || null,
    ehSuporte: m.ehSuporte ?? ['SUPORTE', 'ADMIN'].includes(perfil),
  };
}

/** Detalhe completo: mapeia rigorosamente os campos do ChamadoResponse e relacionamentos. */
export function mapearDetalheChamadoApi(c) {
  const base = mapearChamadoApi(c);
  const classificacao = c.classificacaoIa || c.classificacao || {};
  const slaMetaMinutos = c.slaMetaMinutos
    ?? c.sla?.metaMinutos
    ?? classificacao.slaMetaMinutos
    ?? (typeof c.sla === 'number' ? c.sla : null);

  const clienteBruto = c.cliente ?? c.solicitante;
  const clienteNome = typeof clienteBruto === 'string'
    ? clienteBruto
    : (clienteBruto?.nome || 'Cliente');
  const clienteEmail = c.solicitanteEmail
    || (typeof clienteBruto === 'object' ? clienteBruto?.email : '')
    || '';

  const resumoTecnico = c.resumoTecnicoIa || classificacao.resumoTecnicoIa || {
    sintomaObservado: c.sintomaObservadoIa || classificacao.sintomaObservadoIa || null,
    impactoOperacional: c.impactoOperacionalIa || classificacao.impactoOperacionalIa || null,
  };

  const anexosMapeados = (Array.isArray(c.anexos) ? c.anexos : []).map(mapearAnexoApi);
  const historicoMapeado = (Array.isArray(c.historicoMensagens) ? c.historicoMensagens
    : Array.isArray(c.mensagens) ? c.mensagens
    : Array.isArray(c.historico) ? c.historico : []).map(mapearMensagemApi);

  return {
    ...base,
    origem: c.origemFrontend || c.origem || 'TEXTO',
    statusRaw: c.status,
    prazoResolucao: c.prazoResolucao || null,
    prazoPrimeiraResposta: c.prazoPrimeiraResposta || null,
    slaMetaMinutos,
    sla: c.slaMetaFormatado || formatarSla(slaMetaMinutos),
    slaExcedido: Boolean(c.slaViolado),
    slaViolado: Boolean(c.slaViolado),
    slaTempoRestanteFormatado: c.slaTempoRestanteFormatado || null,
    classificadoPorIa: Boolean(c.classificadoPorIa || c.justificativaIa || classificacao.justificativa),
    justificativaIa: c.justificativaIa ?? c.justificativa ?? classificacao.justificativa ?? null,
    tituloGeradoIa: c.tituloGeradoIa ?? classificacao.tituloGeradoIa ?? null,
    resumoTecnicoIa: resumoTecnico,
    solicitante: {
      id: c.solicitanteId ?? (typeof clienteBruto === 'object' ? clienteBruto?.id : null),
      nome: clienteNome,
      email: clienteEmail,
      empresa: textoDe(c.empresa ?? (typeof clienteBruto === 'object' ? clienteBruto?.empresa : '')),
    },
    solicitanteNome: clienteNome,
    solicitanteEmail: clienteEmail,
    responsavel: {
      id: c.responsavelId ?? null,
      nome: textoDe(c.responsavel) || 'Não atribuído',
    },
    responsavelNome: textoDe(c.responsavel) || 'Não atribuído',
    empresa: textoDe(c.empresa ?? (typeof clienteBruto === 'object' ? clienteBruto?.empresa : '')),
    anexos: anexosMapeados,
    historico: historicoMapeado,
    historicoMensagens: historicoMapeado,
  };
}

/** Envia uma mensagem para o chamado. */
export async function enviarMensagem(chamadoId, texto) {
  if (!chamadoId) throw new Error('Identificador do chamado não fornecido.');
  const textoLimpo = String(texto || '').trim();
  if (!textoLimpo) throw new Error('A mensagem não pode ser vazia.');

  const token = obterToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const idLimpo = encodeURIComponent(String(chamadoId).replace(/^#/, ''));

  try {
    const { data } = await api.post(
      `/chamados/${idLimpo}/mensagens`,
      { texto: textoLimpo, conteudo: textoLimpo },
      { headers }
    );
    return mapearMensagemApi(data);
  } catch (error) {
    const status = error?.response?.status;
    if (status === 409 || status === 400) {
      throw new Error(error?.response?.data?.message || 'Chamados encerrados não aceitam novas mensagens.', { cause: error });
    }
    if (status === 403) {
      throw new Error('Você não tem permissão para enviar mensagens neste chamado.', { cause: error });
    }
    throw new Error(error?.response?.data?.message || 'Erro ao enviar mensagem. Tente novamente.', { cause: error });
  }
}

/** Baixa o arquivo do anexo com autorização Bearer no navegador. */
export async function baixarArquivoAnexo(anexoId, nomeArquivo) {
  const token = obterToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get(`/chamados/anexos/${anexoId}/download`, {
    responseType: 'blob',
    headers,
  });
  const blob = new Blob([response.data], { type: response.headers['content-type'] });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo || `anexo-${anexoId}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** GET /chamados/{id} com suporte a busca simultânea de anexos e mensagens. */
export async function obterChamadoPorId(id) {
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error('Chamado não informado.');
  }
  try {
    const token = obterToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const idLimpo = encodeURIComponent(String(id).replace(/^#/, ''));

    const [chamadoRes, anexosRes, mensagensRes] = await Promise.allSettled([
      api.get(`/chamados/${idLimpo}`, { headers }),
      api.get(`/chamados/${idLimpo}/anexos`, { headers }),
      api.get(`/chamados/${idLimpo}/mensagens`, { headers }),
    ]);

    if (chamadoRes.status === 'rejected') {
      const error = chamadoRes.reason;
      const status = error?.response?.status;
      if (status === 404) throw new Error('Chamado não encontrado.', { cause: error });
      if (status === 403) throw new Error('Você não tem acesso a este chamado.', { cause: error });
      throw new Error(error?.response?.data?.message || 'Não foi possível carregar o chamado. Tente novamente.', { cause: error });
    }

    const chamadoData = chamadoRes.value.data;
    const anexosData = anexosRes.status === 'fulfilled' && Array.isArray(anexosRes.value.data)
      ? anexosRes.value.data
      : (Array.isArray(chamadoData.anexos) ? chamadoData.anexos : []);
    const mensagensData = mensagensRes.status === 'fulfilled' && Array.isArray(mensagensRes.value.data)
      ? mensagensRes.value.data
      : (Array.isArray(chamadoData.mensagens) ? chamadoData.mensagens : []);

    return mapearDetalheChamadoApi({
      ...chamadoData,
      anexos: anexosData,
      historicoMensagens: mensagensData,
    });
  } catch (error) {
    if (error.cause) throw error;
    const status = error?.response?.status;
    if (status === 404) throw new Error('Chamado não encontrado.', { cause: error });
    if (status === 403) throw new Error('Você não tem acesso a este chamado.', { cause: error });
    throw new Error(error?.message || 'Não foi possível carregar o chamado. Tente novamente.', { cause: error });
  }
}

export const criarChamado = criarChamadoApi;

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