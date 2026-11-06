import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Notificacoes.css';

export default function Notificacoes() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('nao-lidas');

  const [listaNotificacoes, setListaNotificacoes] = useState([
    {
      id: 1,
      tipo: 'erro',
      titulo: 'SLA Excedido: Chamado #104 (Scanner não lê código de barras) ultrapassou o tempo limite.',
      data: 'Há 10 min',
      lida: false,
    },
    {
      id: 2,
      tipo: 'info',
      titulo: 'Nova mensagem do Suporte no chamado #108 (Falha na emissão de laudos).',
      data: 'Hoje às 09:20',
      lida: false,
    },
    {
      id: 3,
      tipo: 'alerta',
      titulo: 'Chamado #103 mudou para Em Atendimento.',
      data: 'Ontem às 16:30',
      lida: true,
    },
  ]);

  const marcarTodasComoLidas = () => {
    setListaNotificacoes(
      listaNotificacoes.map((item) => ({ ...item, lida: true }))
    );
  };

  const notificacoesFiltradas = listaNotificacoes.filter((item) => {
    if (abaAtiva === 'nao-lidas') return !item.lida;
    if (abaAtiva === 'mensagens') return item.tipo === 'info';
    if (abaAtiva === 'sla') return item.tipo === 'erro' || item.tipo === 'alerta';
    return true;
  });

  const renderIcon = (tipo) => {
    switch (tipo) {
      case 'erro':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        );
      case 'info':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185DF1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        );
      case 'alerta':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="notificacoes-container">
      <header className="notificacoes-header">
        <small className="subtitulo-app">Suporte Labware</small>
        <h1>Notificações</h1>
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
          <p className="texto-vazio">Nenhuma notificação encontrada.</p>
        ) : (
          notificacoesFiltradas.map((item) => (
            <div key={item.id} className="item-notificacao">
              <div className={`status-icon-circle ${item.tipo}`}>
                {renderIcon(item.tipo)}
              </div>

              <div className="item-info-conteudo">
                <p className="item-titulo">{item.titulo}</p>
                <small className="item-data">{item.data}</small>
              </div>

              <button 
                type="button"
                className="btn-acao-ver-chamado"
                onClick={() => navigate('/detalhes')}
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
