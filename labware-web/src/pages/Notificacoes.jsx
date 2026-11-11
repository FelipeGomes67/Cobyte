import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert, MessageSquare, CheckCircle2 } from 'lucide-react';
import '../css/Notificacoes.css';

export default function Notificacoes() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('nao-lidas');

  const [listaNotificacoes, setListaNotificacoes] = useState([
    {
      id: 1,
      tipo: 'erro',
      categoria: 'sla',
      chamadoId: '104',
      titulo: 'SLA Excedido: Chamado #104 (Scanner não lê código de barras) ultrapassou o tempo limite.',
      data: 'Há 10 min',
      lida: false,
    },
    {
      id: 2,
      tipo: 'info',
      categoria: 'mensagens',
      chamadoId: '108',
      titulo: 'Nova mensagem do Suporte no chamado #108 (Falha na emissão de laudos).',
      data: 'Hoje às 09:20',
      lida: false,
    },
    {
      id: 3,
      tipo: 'alerta',
      categoria: 'status',
      chamadoId: '103',
      titulo: 'Chamado #103 mudou para Em Atendimento.',
      data: 'Ontem às 16:30',
      lida: false,
    },
  ]);

  const marcarTodasComoLidas = () => {
    setListaNotificacoes(prev => prev.map(item => ({ ...item, lida: true })));
  };

  const notificacoesFiltradas = listaNotificacoes.filter(item => {
    if (abaAtiva === 'nao-lidas') return !item.lida;
    if (abaAtiva === 'mensagens') return item.categoria === 'mensagens';
    if (abaAtiva === 'sla') return item.categoria === 'sla' || item.tipo === 'erro';
    return true; // 'todas'
  });

  const renderIcon = tipo => {
    switch (tipo) {
      case 'erro':
        return <TriangleAlert size={18} strokeWidth={2.2} />;
      case 'info':
        return <MessageSquare size={18} strokeWidth={2.2} />;
      case 'alerta':
        return <CheckCircle2 size={18} strokeWidth={2.2} />;
      default:
        return null;
    }
  };

  return (
    <div className="notificacoes-container">
      <header className="notificacoes-header">
        <span className="subtitulo-app">Suporte Labware</span>
        <h1 className="notificacoes-main-title">Notificações</h1>
        <p className="descricao-pagina">Acompanhe seus alertas importantes.</p>
      </header>

      <div className="tabs-notificacao">
        <div className="tabs-grupo">
          <button
            type="button"
            className={`tab-btn-n ${abaAtiva === 'todas' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('todas')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`tab-btn-n ${abaAtiva === 'nao-lidas' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('nao-lidas')}
          >
            Não lidas
          </button>
          <button
            type="button"
            className={`tab-btn-n ${abaAtiva === 'mensagens' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('mensagens')}
          >
            Mensagens
          </button>
          <button
            type="button"
            className={`tab-btn-n ${abaAtiva === 'sla' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('sla')}
          >
            SLA / Alertas
          </button>
        </div>

        <button
          type="button"
          className="btn-link-marcar-lidas"
          onClick={marcarTodasComoLidas}
        >
          Marcar todas como lidas
        </button>
      </div>

      <div className="lista-notificacoes-itens">
        {notificacoesFiltradas.length === 0 ? (
          <div className="item-notificacao-vazio">
            <p>Nenhuma notificação encontrada.</p>
          </div>
        ) : (
          notificacoesFiltradas.map(item => (
            <div key={item.id} className="item-notificacao">
              <div className={`status-icon-circle ${item.tipo}`}>
                {renderIcon(item.tipo)}
              </div>

              <div className="item-info-conteudo">
                <p className="item-titulo">{item.titulo}</p>
                <span className="item-data">{item.data}</span>
              </div>

              <button
                type="button"
                className="btn-acao-ver-chamado"
                onClick={() => navigate(`/chamados/${item.chamadoId}`)}
              >
                Ver chamado
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
