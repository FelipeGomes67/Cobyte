import api from './api.js';
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
