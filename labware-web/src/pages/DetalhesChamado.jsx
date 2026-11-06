import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAutenticacao } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';
import SelectStatus from '../components/layout/SelectStatus';
import '../css/DetalhesChamado.css';

// Conteúdo extraído da tela enviada. As ações de mensagem, anexos e reabertura
// mantêm o comportamento demonstrativo do código de origem.
const codigosStatus = {
  Aberto: 'ABERTO',
  'Em análise': 'EM_ANALISE',
  'Em andamento': 'EM_ATENDIMENTO',
  'Em atendimento': 'EM_ATENDIMENTO',
  'Aguardando cliente': 'AGUARDANDO_CLIENTE',
  Resolvido: 'RESOLVIDO',
  Fechado: 'FECHADO',
};

const nomesStatus = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em análise',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

function DetalhesEmAtendimento({ chamado, aoVoltar }) {
  const [novoStatus, definirNovoStatus] = useState('');
  const codigoAtual = codigosStatus[chamado?.status] || chamado?.status;
  const statusExibido = nomesStatus[novoStatus || codigoAtual] || chamado?.status;
  const classeStatus = statusExibido === 'Resolvido' || statusExibido === 'Fechado'
    ? 'done' : statusExibido === 'Aberto' ? 'open' : 'progress';
  if (!chamado) {
    return <div className="panel empty-state">Nenhum chamado para exibir.</div>;
  }

  if (['RESOLVIDO', 'FECHADO'].includes(codigoAtual)) {
    return <DetalhesEncerrados chamado={chamado} aoVoltar={aoVoltar} />;
  }

  const descricao = chamado.description || `Solicitação da categoria ${chamado.category} referente a "${chamado.title}". O cliente reportou o problema e acompanha a resolução do atendimento via suporte.`;

  return (
    <div className="history-page-shell">
      <button type="button" className="ticket-back-link" onClick={aoVoltar}><ArrowLeft size={14} aria-hidden="true"/>Voltar para chamados</button>
      <div className="history-shell panel">
        <div className="history-layout">
          <section className="history-main-content" aria-label="Informações do chamado">
            <div className="history-header-row">
              <span className="history-ticket-code">{chamado.id}</span>
              <span className={`status-tag ${classeStatus}`}><i aria-hidden="true" />{statusExibido}</span>
            </div>

            <h1 className="history-title">{chamado.title}</h1>
            <p className="history-description">{descricao}</p>

            <div className="history-people-row">
              <div className="history-person-box">
                <span className="history-person-label">Responsável</span>
                <strong>{chamado.ownerId || 'Ronaldo'}</strong>
              </div>
              <div className="history-person-box">
                <span className="history-person-label">Suporte</span>
                <strong>Ruffles</strong>
              </div>
            </div>

            <div className="history-conversation">
              <div className="history-conversation-header">
                <span className="conversation-pill">Conversa</span>
                <span className="conversation-date">{new Date(chamado.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="history-message-row">
                <div className="avatar small-avatar">R</div>
                <div className="history-message-card customer-message">
                  <strong>{chamado.ownerId || 'Ronaldo'}</strong>
                  <p>{descricao}</p>
                </div>
              </div>

              <div className="history-message-row right-align">
                <div className="history-message-card support-message">
                  <strong>Ruffles</strong>
                  <p>Vamos analisar o chamado e manter o cliente informado sobre o andamento da correção.</p>
                </div>
                <div className="avatar small-avatar support-avatar">S</div>
              </div>

              <div className="history-message-composer">
                <input type="text" aria-label="Nova mensagem" placeholder="Nova mensagem" />
                <button className="primary-button">Enviar mensagem</button>
              </div>
            </div>

            <div className="history-evidences">
              <div className="evidence-header">
                <h4>Evidências</h4>
                <button type="button" className="secondary-button small-button">Baixar</button>
              </div>
              <div className="evidence-item">
                <span className="evidence-text">Captura de tela 2026-10-27 10:14:25.png</span>
                <span className="evidence-size">1.4 MB</span>
              </div>
            </div>
          </section>

          <aside className="history-sidebar">
            <div className="history-summary-card">
              <div className="summary-header">
                <span className="summary-label">LABWARE</span>
                <span className={`status-tag ${classeStatus}`}><i aria-hidden="true"/>{statusExibido}</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item"><span>SLA</span><strong>12h</strong></div>
                <div className="summary-item"><span>Tempo restante</span><strong>11:58:23</strong></div>
                <div className="summary-item"><span>Prioridade</span><strong>{chamado.priority}</strong></div>
                <div className="summary-item"><span>Responsável</span><strong>{chamado.ownerId || 'Lucas Ribeiro'}</strong></div>
                <div className="summary-item"><span>Categoria</span><strong>{chamado.category}</strong></div>
                <div className="summary-item"><span>Origem</span><strong>AUDIO VOZ</strong></div>
                <div className="summary-item"><span>Prazo</span><strong>{new Date(chamado.createdAt).toLocaleDateString('pt-BR')}</strong></div>
                <div className="summary-item"><span>Última resposta</span><strong>Suporte</strong></div>
              </div>
            </div>

            <div className="history-info-card">
              <h4>Atendimento</h4>
              <p>Status atual: {statusExibido}. Atualize o status, atribua o responsável e mantenha o cliente informado.</p>
              <div className="history-form-stack">
                <div className="status-fixed-row">
                  <SelectStatus statusAtual={novoStatus || codigoAtual} valor="" aoAlterar={definirNovoStatus}/>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


function DetalhesEncerrados({ chamado, aoVoltar }) {
  if (!chamado) {
    return <div className="panel empty-state">Nenhum chamado resolvido para exibir.</div>;
  }

  const descricao = chamado.description || 'O sistema mostrou instabilidade e a equipe realizou a correção no ambiente de produção. A manutenção foi validada e o chamado foi encerrado com sucesso.';
  const dataResolucao = chamado.resolvedAt ? new Date(chamado.resolvedAt).toLocaleDateString('pt-BR') : new Date(chamado.createdAt).toLocaleDateString('pt-BR');
  const statusExibido = nomesStatus[codigosStatus[chamado.status] || chamado.status] || chamado.status;

  return (
    <div className="history-page-shell">
      <button type="button" className="ticket-back-link" onClick={aoVoltar}><ArrowLeft size={14} aria-hidden="true"/>Voltar para chamados</button>
      <div className="history-shell panel">
        <div className="history-layout">
          <section className="history-main-content" aria-label="Informações do chamado">
            <div className="history-header-row">
              <span className="history-ticket-code">{chamado.id}</span>
              <span className="status-tag done"><i aria-hidden="true" />{statusExibido}</span>
            </div>

            <h1 className="history-title">{chamado.title}</h1>
            <p className="history-description">{descricao}</p>

            <div className="history-people-row">
              <div className="history-person-box">
                <span className="history-person-label">Responsável</span>
                <strong>Ronaldo</strong>
              </div>
              <div className="history-person-box">
                <span className="history-person-label">Suporte</span>
                <strong>Ruffles</strong>
              </div>
            </div>

            <div className="history-conversation">
              <div className="history-conversation-header">
                <span className="conversation-pill">Conversa</span>
                <span className="conversation-date">{new Date(chamado.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="history-message-row">
                <div className="avatar small-avatar">R</div>
                <div className="history-message-card customer-message">
                  <strong>Ronaldo</strong>
                  <p>O sistema está instável e a equipe realizou a correção no ambiente de produção. A manutenção foi validada e o chamado foi encerrado com sucesso.</p>
                </div>
              </div>

              <div className="history-message-row right-align">
                <div className="history-message-card support-message">
                  <strong>Ruffles</strong>
                  <p>O erro foi corrigido e o processo de monitoramento foi ajustado para evitar recorrência. Seguimos atento ao comportamento do sistema.</p>
                </div>
                <div className="avatar small-avatar support-avatar">S</div>
              </div>

              <div className="history-message-composer">
                <input type="text" aria-label="Nova mensagem" placeholder="Nova mensagem" />
                <button className="primary-button">Enviar mensagem</button>
              </div>
            </div>

            <div className="history-evidences">
              <div className="evidence-header">
                <h4>Evidências</h4>
                <button type="button" className="secondary-button small-button">Baixar</button>
              </div>
              <div className="evidence-item">
                <span className="evidence-text">Captura de tela 2026-10-27 10:14:25.png</span>
                <span className="evidence-size">1.4 MB</span>
              </div>
            </div>

            <div className="history-rating">
              <h4>Avaliação do cliente</h4>
              <div className="stars" aria-label="Avaliação 5 de 5">★★★★★</div>
              <p>Boa</p>
              <small>{dataResolucao}</small>
            </div>
          </section>

          <aside className="history-sidebar">
            <div className="history-summary-card">
              <div className="summary-header">
                <span className="summary-label">LABWARE</span>
                <span className="summary-progress">Cumprido</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item"><span>Prioridade</span><strong>{chamado.priority}</strong></div>
                <div className="summary-item"><span>Responsável</span><strong>Lucas Ribeiro</strong></div>
                <div className="summary-item"><span>Categoria</span><strong>{chamado.category}</strong></div>
                <div className="summary-item"><span>Origem</span><strong>AUDIO VOZ</strong></div>
                <div className="summary-item"><span>Última resposta</span><strong>{dataResolucao}</strong></div>
                <div className="summary-item"><span>Data de criação</span><strong>{new Date(chamado.createdAt).toLocaleDateString('pt-BR')}</strong></div>
              </div>

              <button className="secondary-button wide-button" onClick={aoVoltar}>Reabrir chamado</button>
            </div>

            <div className="history-info-card">
              <h4>Atendimento</h4>
              <p>Chamado encerrado. Reabra o atendimento para registrar nova atualização.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function DetalhesChamado() {
  const { id, ticketId } = useParams();
  const { pathname: caminho } = useLocation();
  const navegar = useNavigate();
  const { usuario } = useAutenticacao();
  const { tickets: chamados, loading: carregando, error: erro } = useTickets();
  const codigo = id || ticketId;
  const chamado = chamados.find(item => String(item.id) === codigo
    && (usuario?.role === 'support' || item.ownerId === usuario?.id));
  const origem = caminho.split('/')[1];
  const destino = ['dashboard', 'chamados', 'meus-chamados', 'historico'].includes(origem)
    ? '/' + origem : '/chamados';
  const voltar = () => navegar(destino);

  return <div className="detalhes-chamado-page">
    {erro && <p className="detalhes-aviso" role="alert">{erro}</p>}
    {carregando ? <p className="panel empty-state" role="status">Carregando chamado…</p>
      : chamado ? <DetalhesEmAtendimento key={chamado.id + '-' + chamado.status} chamado={chamado} aoVoltar={voltar}/>
        : <><button type="button" className="ticket-back-link" onClick={voltar}><ArrowLeft size={14} aria-hidden="true"/>Voltar para chamados</button><p className="panel empty-state" role="status">Chamado não encontrado ou indisponível para este usuário.</p></>}
  </div>;
}
