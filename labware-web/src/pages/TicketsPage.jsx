import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Headset } from 'lucide-react';
import { createTicket, obterMeusChamados } from '../services/ticketService';
import { sendNotification } from '../utils/notifications';
import { useAutenticacao } from '../hooks/useAuth';
import TabelaChamados from '../components/ticket/TabelaChamados';

function Heading({ title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">Central de Suporte</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function TicketsPage({ mode }) {
  const [query, setQuery] = useState('');
  const [chamadosApi, setChamadosApi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { usuario: user } = useAutenticacao();
  const ehSuporte =
    user?.role === 'support' ||
    user?.perfil === 'SUPORTE' ||
    user?.perfil === 'ADMIN';
  const ehCliente =
    user?.perfil === 'CLIENTE' ||
    user?.role === 'client';

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        setLoading(true);
        const lista = await obterMeusChamados();
        if (ativo) {
          setChamadosApi(lista);
          setError(null);
        }
      } catch (err) {
        if (ativo) {
          setError(err.message || 'Falha ao carregar chamados');
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const userTickets = ehSuporte
    ? chamadosApi
    : (chamadosApi || []).filter(ticket => !ticket.ownerId || ticket.ownerId === user?.id || ticket.solicitante === user?.nome);
  let tickets = userTickets;
  let title = 'Todos os chamados';
  if (mode === 'mine') {
    title = 'Meus chamados';
    tickets = (chamadosApi || []).filter(ticket => !ticket.ownerId || ticket.ownerId === user?.id || ticket.solicitante === user?.nome);
  } else if (mode === 'history') {
    title = 'Histórico de chamados';
    tickets = (tickets || []).filter(ticket => ticket.status === 'Resolvido' || ticket.status === 'Fechado');
  } else if (!ehSuporte) {
    title = 'Meus chamados';
  }

  const createButton = ehCliente ? (
    <button className="primary-button btn-novo-chamado" onClick={() => navigate('/chamados/novo')}>
      <span>＋</span> Novo chamado
    </button>
  ) : null;
  return <>
    <Heading title={title} description="Acompanhe solicitações e atualizações da equipe de suporte." action={createButton}/>
    {loading && <div className="panel loading-state" role="status">Carregando chamados…</div>}
    {error && <div className="data-warning" role="status">{error}</div>}
    {!loading && <TabelaChamados historico={mode === 'history'} titulo={mode === 'history' ? 'Histórico de chamados' : 'Solicitações'} tickets={tickets} query={query} onSearch={setQuery} rotaBase="/chamados"/>}
    <div className="list-note"><Headset size={17}/> Precisa de ajuda? <a href="mailto:suporte@labware.com.br">Fale com o suporte LabWare</a></div>
  </>;
}

export function MeusChamados() {
  return <TicketsPage mode="mine" />;
}

export function NewTicketPage() {
  const navigate = useNavigate();
  const { usuario: user } = useAutenticacao();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Acesso');
  const [priority, setPriority] = useState('Média');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const ehCliente = user?.perfil === 'CLIENTE' || user?.role === 'client';
  if (!ehCliente) {
    return <Navigate to="/chamados" replace />;
  }

  function submit(event) {
    event.preventDefault();
    if (description.trim().length < 10) {
      setError('Descreva o problema com pelo menos 10 caracteres.');
      return;
    }
    let ticket;
    try {
      ticket = createTicket({ title: title.trim(), category, description: description.trim(), priority, ownerId: user.id });
    } catch {
      setError('Não foi possível salvar o chamado neste navegador. Verifique o armazenamento local e tente novamente.');
      return;
    }
    sendNotification('assigned', `Chamado ${ticket.id} criado`, ticket.title);
    if (priority === 'Crítica') sendNotification('critical', 'Chamado crítico criado', ticket.title);
    navigate('/chamados');
  }

  return <>
    <Heading title="Novo chamado" description="Conte para a equipe de suporte como podemos ajudar."/>
    <form className="panel settings-panel ticket-form" onSubmit={submit}>
      <label className="form-label">Assunto<input required maxLength="120" value={title} onChange={event => setTitle(event.target.value)} placeholder="Resuma sua solicitação"/></label>
      <label className="form-label">Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option>Acesso</option><option>Integração</option><option>Indisponibilidade</option><option>Dúvida</option><option>Segurança</option><option>Outros</option></select></label>
      <label className="form-label">Prioridade<select value={priority} onChange={event => setPriority(event.target.value)}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option><option>Crítica</option></select></label>
      <label className="form-label">Descrição<textarea required minLength="10" rows="6" value={description} onChange={event => setDescription(event.target.value)} placeholder="Descreva o problema e os passos para reproduzi-lo"/></label>
      {error && <p id="ticket-error" className="form-error" role="alert">{error}</p>}
      <div className="settings-footer"><button type="button" className="secondary-button" onClick={() => navigate(-1)}>Cancelar</button><button className="primary-button" type="submit">Enviar chamado</button></div>
    </form>
  </>;
}
