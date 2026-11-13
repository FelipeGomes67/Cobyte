import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headset } from 'lucide-react';
import { obterMeusChamados } from '../services/ticketService';
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

  const meus = chamadosApi.filter(ticket => {
    const id = ehSuporte ? ticket.responsavelId : ticket.solicitanteId;
    return id != null && user?.id != null && String(id) === String(user.id);
  });
  let tickets = (mode === 'mine' || !ehSuporte) ? meus : chamadosApi;
  const finalizados = ['Resolvido', 'Fechado', 'Cancelado'];
  tickets = tickets.filter(ticket => mode === 'history' ? finalizados.includes(ticket.status) : !finalizados.includes(ticket.status));
  const title = mode === 'history' ? 'Histórico de chamados' : mode === 'mine' || !ehSuporte ? 'Meus chamados' : 'Todos os chamados';

  const createButton = ehCliente ? (
    <button className="primary-button btn-novo-chamado" onClick={() => navigate('/chamados/novo')}>
      <span>＋</span> Novo chamado
    </button>
  ) : null;
  return <>
    <Heading title={title} description="Acompanhe solicitações e atualizações da equipe de suporte." action={createButton}/>
    {loading && <div className="panel loading-state" role="status">Carregando chamados...</div>}
    {error && <div className="data-warning" role="status">{error}</div>}
    {!loading && <TabelaChamados porPrioridade={mode === 'mine'} historico={mode === 'history'} titulo={mode === 'history' ? 'Histórico de chamados' : 'Solicitações'} tickets={tickets} query={query} onSearch={setQuery} rotaBase="/chamados"/>}
    <div className="list-note"><Headset size={17}/> Precisa de ajuda? <a href="mailto:suporte@labware.com.br">Fale com o suporte LabWare</a></div>
  </>;
}

export function MeusChamados() {
  return <TicketsPage mode="mine" />;
}
