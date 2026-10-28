import React, { useState } from 'react';
import '../css/Notificacoes.css';
import iconErro from '../../public/icons/alert-triangle.svg';
import iconInfo from '../../public/icons/message-circle.svg';
import iconAlerta from '../../public/icons/check-circle.svg';

export default function Notificacoes() {
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
                return <img src={iconErro} alt="Erro" />;
            case 'info':
                return <img src={iconInfo} alt="Info" />;
            case 'alerta':
                return <img src={iconAlerta} alt="Alerta" />;
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

            <div className="card-notificacoes-wrapper">
                <div className="tabs-notificacao">
                    <div className="tabs-grupo">
                        <button
                            className={`tab-btn-n ${abaAtiva === 'todas' ? 'ativa' : ''}`}
                            onClick={() => setAbaAtiva('todas')}
                        >
                            Todas
                        </button>
                        <button
                            className={`tab-btn-n ${abaAtiva === 'nao-lidas' ? 'ativa' : ''}`}
                            onClick={() => setAbaAtiva('nao-lidas')}
                        >
                            Não lidas
                        </button>
                        <button
                            className={`tab-btn-n ${abaAtiva === 'mensagens' ? 'ativa' : ''}`}
                            onClick={() => setAbaAtiva('mensagens')}
                        >
                            Mensagens
                        </button>
                        <button
                            className={`tab-btn-n ${abaAtiva === 'sla' ? 'ativa' : ''}`}
                            onClick={() => setAbaAtiva('sla')}
                        >
                            SLA / Alertas
                        </button>
                    </div>

                    <button
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

                                <button className="btn-acao-ver-chamado">Ver chamado</button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}