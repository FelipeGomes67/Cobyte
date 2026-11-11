import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Image,
  FileText,
  Volume2,
  File,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useAutenticacao } from '../hooks/useAuth';
import {
  obterChamadoPorId,
  baixarArquivoAnexo,
  enviarMensagem,
  reabrirChamado,
  alterarStatus,
  alterarPrioridade,
} from '../services/ticketService';
import SelectStatus from '../components/layout/SelectStatus';
import '../css/DetalhesChamado.css';

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

function formatarData(dataIso) {
  if (!dataIso) return '-';
  try {
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return '-';
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dataIso);
  }
}

function obterClassePrioridade(prioridade) {
  const p = String(prioridade || '').toUpperCase();
  if (p.includes('CRITIC') || p.includes('CRÍTICA')) return 'priority-critica';
  if (p.includes('ALT')) return 'priority-alta';
  if (p.includes('MED') || p.includes('MÉDIA')) return 'priority-media';
  return 'priority-baixa';
}

function calcularTempoRestanteSla(prazoResolucao, slaViolado, slaTempoRestanteFormatado) {
  if (slaTempoRestanteFormatado) {
    const ehAtrasado = Boolean(
      slaViolado ||
      slaTempoRestanteFormatado.toLowerCase().includes('atras') ||
      slaTempoRestanteFormatado.toLowerCase().includes('exced') ||
      slaTempoRestanteFormatado.toLowerCase().includes('violad')
    );
    return {
      texto: slaTempoRestanteFormatado,
      excedido: ehAtrasado,
    };
  }

  if (!prazoResolucao) {
    return { texto: 'Sem SLA', excedido: false };
  }

  const agora = Date.now();
  const limite = new Date(prazoResolucao).getTime();
  if (Number.isNaN(limite)) {
    return { texto: 'Não definido', excedido: false };
  }

  const diffMs = limite - agora;
  if (diffMs <= 0 || slaViolado) {
    const atrasoMin = Math.abs(Math.round(diffMs / 60000));
    const horas = Math.floor(atrasoMin / 60);
    const min = atrasoMin % 60;
    return {
      texto: horas > 0 ? `Excedido em ${horas}h ${min}m` : `Excedido em ${min}m`,
      excedido: true,
    };
  }

  const restantesMin = Math.round(diffMs / 60000);
  const horas = Math.floor(restantesMin / 60);
  const min = restantesMin % 60;
  return {
    texto: horas > 0 ? `${horas}h ${min}m restantes` : `${min}m restantes`,
    excedido: false,
  };
}

function PainelIa({ chamado }) {
  const classificacao = chamado?.classificacaoIa || {};
  const tituloSugerido = chamado?.tituloGeradoIa || classificacao.tituloGeradoIa;
  const justificativa = chamado?.justificativaIa || classificacao.justificativa;
  const resumo = chamado?.resumoTecnicoIa || classificacao.resumoTecnicoIa || {};
  const sintoma = resumo.sintomaObservado || chamado?.sintomaObservadoIa || 'Não identificado especificamente';
  const impacto = resumo.impactoOperacional || chamado?.impactoOperacionalIa || 'Impacto operacional padrão do setor';

  const temDadosIa = Boolean(tituloSugerido || justificativa || resumo.sintomaObservado || resumo.impactoOperacional);

  if (!temDadosIa) {
    return (
      <div className="history-ia-card fallback">
        <div className="history-ia-header">
          <Sparkles size={14} />
          <strong>Triagem por IA</strong>
        </div>
        <p className="ia-justificativa">Classificação padrão aplicada pelo sistema.</p>
      </div>
    );
  }

  return (
    <div className="history-ia-card">
      <div className="history-ia-header">
        <Sparkles size={15} />
        <strong>Triagem por Inteligência Artificial</strong>
      </div>

      {tituloSugerido && (
        <div className="ia-item-secao">
          <span className="ia-label">Título Técnico Sugerido:</span>
          <p className="ia-titulo-sugerido">{tituloSugerido}</p>
        </div>
      )}

      {justificativa && (
        <div className="ia-item-secao">
          <span className="ia-label">Classificação & SLA (Justificativa):</span>
          <p className="ia-justificativa">{justificativa}</p>
        </div>
      )}

      <div className="ia-resumo-destaques">
        <div className="ia-resumo-topico">
          <span className="ia-topico-badge">Sintoma observado</span>
          <p>{sintoma}</p>
        </div>
        <div className="ia-resumo-topico">
          <span className="ia-topico-badge">Impacto operacional</span>
          <p>{impacto}</p>
        </div>
      </div>
    </div>
  );
}

function SecaoAnexos({ anexos }) {
  const lista = Array.isArray(anexos) ? anexos : [];
  return (
    <div className="history-evidences">
      <div className="evidence-header">
        <h4>Evidências ({lista.length})</h4>
      </div>
      {lista.length > 0 ? (
        <div className="evidence-list">
          {lista.map((anexo, idx) => {
            const ehImagem = anexo.tipoMime?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(anexo.nomeArquivo);
            const ehAudio = anexo.tipoMime?.startsWith('audio/') || /\.(wav|mp3|ogg|m4a|flac)$/i.test(anexo.nomeArquivo);
            const ehPdf = anexo.tipoMime?.includes('pdf') || /\.pdf$/i.test(anexo.nomeArquivo);

            const Icone = ehImagem ? Image : ehAudio ? Volume2 : ehPdf ? FileText : File;
            const tamanhoFormatado = (() => {
              const b = anexo.tamanhoBytes;
              if (b == null || b === 0) return '';
              if (b < 1024) return '< 1 KB';
              if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
              return `${(b / (1024 * 1024)).toFixed(1)} MB`;
            })();

            return (
              <div key={anexo.id || idx} className="evidence-item">
                <div className="evidence-info">
                  <Icone size={15} className="icone-anexo" />
                  <span className="evidence-text" title={anexo.nomeArquivo}>
                    {anexo.nomeArquivo}
                  </span>
                  {tamanhoFormatado && <span className="evidence-size">{tamanhoFormatado}</span>}
                </div>
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => baixarArquivoAnexo(anexo.id, anexo.nomeArquivo)}
                  title={`Baixar ${anexo.nomeArquivo}`}
                >
                  <Download size={12} /> Baixar
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="evidence-empty">Nenhum anexo enviado neste chamado.</p>
      )}
    </div>
  );
}

function SecaoConversa({ chamado, onNovaMensagem, onReabrir, reabrindo }) {
  const mensagens = Array.isArray(chamado.historico) && chamado.historico.length > 0
    ? chamado.historico
    : Array.isArray(chamado.historicoMensagens) && chamado.historicoMensagens.length > 0
    ? chamado.historicoMensagens
    : [];

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const fimConversaRef = useRef(null);

  const chamadoEncerrado = chamado?.status === 'Resolvido' || chamado?.status === 'Fechado'
    || chamado?.statusRaw === 'RESOLVIDO' || chamado?.statusRaw === 'FECHADO';

  const dataAbertura = formatarData(chamado.dataCriacao || chamado.abertoEm);

  const rolarParaOFim = () => {
    fimConversaRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    rolarParaOFim();
  }, [mensagens.length]);

  async function handleEnviar(evento) {
    if (evento) evento.preventDefault();
    if (enviando || !texto.trim()) return;

    if (chamadoEncerrado) {
      setErroEnvio('Chamados encerrados não aceitam novas mensagens.');
      return;
    }

    setEnviando(true);
    setErroEnvio('');

    const textoParaEnviar = texto.trim();
    try {
      const novaMensagem = await enviarMensagem(chamado.id, textoParaEnviar);
      setTexto('');
      if (onNovaMensagem) {
        onNovaMensagem(novaMensagem);
      }
      setTimeout(rolarParaOFim, 50);
    } catch (err) {
      setErroEnvio(err.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  function handleKeyDown(evento) {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      handleEnviar();
    }
  }

  return (
    <div className="history-conversation">
      <div className="history-conversation-header">
        <span className="conversation-pill">Conversa</span>
        <span className="conversation-date">{dataAbertura}</span>
      </div>

      <div className="history-message-row">
        <div className="avatar small-avatar">
          {(chamado.solicitanteNome || 'C').charAt(0).toUpperCase()}
        </div>
        <div className="history-message-card customer-message">
          <strong>{chamado.solicitanteNome || 'Solicitante'}</strong>
          <p>{chamado.descricao || chamado.description}</p>
        </div>
      </div>

      {mensagens.map((msg, index) => {
        const ehSuporte = msg.ehSuporte;
        const inicial = (msg.autor || (ehSuporte ? 'S' : 'C')).charAt(0).toUpperCase();

        return (
          <div
            key={msg.id || index}
            className={`history-message-row ${ehSuporte ? 'right-align' : ''}`}
          >
            {!ehSuporte && <div className="avatar small-avatar">{inicial}</div>}
            <div className={`history-message-card ${ehSuporte ? 'support-message' : 'customer-message'}`}>
              <strong>{msg.autor}</strong>
              <p>{msg.texto}</p>
            </div>
            {ehSuporte && <div className="avatar small-avatar support-avatar">{inicial}</div>}
          </div>
        );
      })}

      {erroEnvio && (
        <p className="mensagem-erro-conversa" role="alert">{erroEnvio}</p>
      )}

      {!chamadoEncerrado ? (
        <form className="history-message-composer" onSubmit={handleEnviar}>
          <textarea
            rows={1}
            aria-label="Nova mensagem"
            placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para quebrar linha)"
            value={texto}
            onChange={e => {
              setTexto(e.target.value);
              if (erroEnvio) setErroEnvio('');
            }}
            onKeyDown={handleKeyDown}
            disabled={enviando}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={enviando || !texto.trim()}
          >
            {enviando ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </form>
      ) : (
        <div className="history-message-composer-encerrado">
          <p>Este chamado está encerrado e não aceita novas mensagens.</p>
          {onReabrir && (
            <button
              type="button"
              className="secondary-button small-button btn-reabrir"
              onClick={onReabrir}
              disabled={reabrindo}
            >
              <RotateCcw size={12} /> {reabrindo ? 'Reabrindo chamado…' : 'Reabrir chamado'}
            </button>
          )}
        </div>
      )}
      <div ref={fimConversaRef} />
    </div>
  );
}

function DetalhesEmAtendimento({
  chamado,
  aoVoltar,
  ehSuporte,
  onNovaMensagem,
  onReabrir,
  reabrindo,
  onChamadoAtualizado,
}) {
  const codigoAtual = chamado?.statusRaw || codigosStatus[chamado?.status] || chamado?.status;
  const statusExibido = nomesStatus[codigoAtual] || chamado?.status;
  const classeStatus = statusExibido === 'Resolvido' || statusExibido === 'Fechado'
    ? 'done' : statusExibido === 'Aberto' ? 'open' : 'progress';
  const classePrioridade = obterClassePrioridade(chamado?.prioridade || chamado?.priority);
  const infoSla = calcularTempoRestanteSla(chamado?.prazoResolucao, chamado?.slaViolado || chamado?.slaExcedido, chamado?.slaTempoRestanteFormatado);

  const statusAtivo = ['ABERTO', 'EM_ANALISE', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE'].includes(codigoAtual);
  const podeEditar = ehSuporte && statusAtivo;
  const podeAlterarStatus = podeEditar;
  const podeAlterarPrioridade = podeEditar;

  const [statusSelecionado, setStatusSelecionado] = useState('');
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  const prioridadeNormalizada = String(chamado?.prioridade || chamado?.priority || 'MEDIA').toUpperCase();
  const [prioridadeSelecionada, setPrioridadeSelecionada] = useState(prioridadeNormalizada);
  const [salvandoPrioridade, setSalvandoPrioridade] = useState(false);

  const [feedbackAtendimento, setFeedbackAtendimento] = useState(null);

  if (!chamado) {
    return <div className="panel empty-state">Nenhum chamado para exibir.</div>;
  }

  if (['RESOLVIDO', 'FECHADO'].includes(codigoAtual)) {
    return (
      <DetalhesEncerrados
        chamado={chamado}
        aoVoltar={aoVoltar}
        onNovaMensagem={onNovaMensagem}
        onReabrir={onReabrir}
        reabrindo={reabrindo}
      />
    );
  }

  const tituloExibicao = chamado.tituloGeradoIa || chamado.classificacaoIa?.tituloGeradoIa || chamado.titulo || chamado.title;
  const descricao = chamado.descricao || chamado.description || 'Sem descrição informada.';

  const handleConfirmarStatus = async () => {
    if (!statusSelecionado || statusSelecionado === codigoAtual || salvandoStatus) return;
    setSalvandoStatus(true);
    setFeedbackAtendimento(null);
    try {
      const atualizado = await alterarStatus(chamado.id, statusSelecionado);
      setStatusSelecionado('');
      setFeedbackAtendimento({ tipo: 'sucesso', texto: 'Status alterado com sucesso!' });
      if (onChamadoAtualizado) onChamadoAtualizado(atualizado);
    } catch (err) {
      setFeedbackAtendimento({ tipo: 'erro', texto: err.message || 'Não foi possível alterar o status.' });
    } finally {
      setSalvandoStatus(false);
    }
  };

  const handleSalvarPrioridade = async () => {
    if (!prioridadeSelecionada || prioridadeSelecionada === prioridadeNormalizada || salvandoPrioridade) return;
    setSalvandoPrioridade(true);
    setFeedbackAtendimento(null);
    try {
      const atualizado = await alterarPrioridade(chamado.id, prioridadeSelecionada);
      setFeedbackAtendimento({ tipo: 'sucesso', texto: 'Prioridade alterada com sucesso!' });
      if (onChamadoAtualizado) onChamadoAtualizado(atualizado);
    } catch (err) {
      setFeedbackAtendimento({ tipo: 'erro', texto: err.message || 'Não foi possível alterar a prioridade.' });
    } finally {
      setSalvandoPrioridade(false);
    }
  };

  return (
    <div className="history-page-shell">
      <button type="button" className="ticket-back-link" onClick={aoVoltar}>
        <ArrowLeft size={14} aria-hidden="true" /> Voltar para chamados
      </button>
      <div className="history-shell panel">
        <div className="history-layout">
          <section className="history-main-content" aria-label="Informações do chamado">
            <div className="history-header-row">
              <span className="history-ticket-code">{chamado.protocolo || `#${chamado.id}`}</span>
              <div className="header-tags">
                <span className={`status-tag priority ${classePrioridade}`}>
                  {chamado.prioridade || chamado.priority}
                </span>
                <span className={`status-tag ${classeStatus}`}>
                  <i aria-hidden="true" />{statusExibido}
                </span>
              </div>
            </div>

            <h1 className="history-title">{tituloExibicao}</h1>
            <p className="history-description">{descricao}</p>

            <PainelIa chamado={chamado} />

            <div className="history-people-row">
              <div className="history-person-box">
                <span className="history-person-label">Solicitante</span>
                <strong>{chamado.solicitanteNome || 'Cliente'}</strong>
                {chamado.solicitanteEmail && <small>{chamado.solicitanteEmail}</small>}
              </div>
              <div className="history-person-box">
                <span className="history-person-label">Técnico Responsável</span>
                <strong>{chamado.responsavelNome || 'Não atribuído'}</strong>
              </div>
            </div>

            <SecaoConversa
              chamado={chamado}
              onNovaMensagem={onNovaMensagem}
              onReabrir={onReabrir}
              reabrindo={reabrindo}
            />
            <SecaoAnexos anexos={chamado.anexos} />
          </section>

          <aside className="history-sidebar">
            <div className="history-summary-card">
              <div className="summary-header">
                <span className="summary-label">LABWARE</span>
                <span className={`status-tag ${classeStatus}`}><i aria-hidden="true" />{statusExibido}</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item">
                  <span>SLA Estimado</span>
                  <strong>{chamado.sla || 'Sem SLA'}</strong>
                </div>
                <div className={`summary-item ${infoSla.excedido ? 'sla-atrasado' : ''}`}>
                  <span>Tempo Restante</span>
                  <strong className={infoSla.excedido ? 'texto-alerta-sla' : ''}>
                    {infoSla.excedido && <AlertTriangle size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />}
                    {infoSla.texto}
                  </strong>
                </div>
                <div className="summary-item">
                  <span>Prioridade</span>
                  <strong>{chamado.prioridade || chamado.priority}</strong>
                </div>
                <div className="summary-item">
                  <span>Responsável</span>
                  <strong>{chamado.responsavelNome || 'Não atribuído'}</strong>
                </div>
                <div className="summary-item">
                  <span>Categoria</span>
                  <strong>{chamado.categoria || chamado.category}</strong>
                </div>
                <div className="summary-item">
                  <span>Origem</span>
                  <strong>{chamado.origem || 'PORTAL_TEXTO'}</strong>
                </div>
                <div className="summary-item">
                  <span>Data de Abertura</span>
                  <strong>{formatarData(chamado.dataCriacao || chamado.abertoEm)}</strong>
                </div>
                <div className="summary-item">
                  <span>Prazo Limite</span>
                  <strong>{formatarData(chamado.prazoResolucao)}</strong>
                </div>
              </div>
            </div>

            <div className="history-info-card">
              <h4>Atendimento</h4>
              {ehSuporte ? (
                <>
                  <p>
                    Status atual: <strong>{statusExibido}</strong>.
                  </p>

                  {feedbackAtendimento && (
                    <p className={`aviso-atendimento ${feedbackAtendimento.tipo}`} role="alert">
                      {feedbackAtendimento.texto}
                    </p>
                  )}

                  <div className="history-form-stack">
                    {podeAlterarStatus && (
                      <div className="status-fixed-group">
                        <SelectStatus
                          statusAtual={codigoAtual}
                          valor={statusSelecionado}
                          aoAlterar={setStatusSelecionado}
                          desabilitado={salvandoStatus}
                        />
                        <button
                          type="button"
                          className="primary-button small-button btn-confirmar-status"
                          onClick={handleConfirmarStatus}
                          disabled={salvandoStatus || !statusSelecionado || statusSelecionado === codigoAtual}
                        >
                          {salvandoStatus ? 'Salvando...' : 'Confirmar Status'}
                        </button>
                      </div>
                    )}

                    {podeAlterarPrioridade && (
                      <div className="status-fixed-group prioridade-group">
                        <label className="select-status">
                          <span className="select-status-label">Alterar prioridade</span>
                          <span className="select-status-control">
                            <select
                              className="select-status-input"
                              value={prioridadeSelecionada}
                              onChange={(e) => setPrioridadeSelecionada(e.target.value)}
                              disabled={salvandoPrioridade}
                            >
                              <option value="BAIXA">Baixa</option>
                              <option value="MEDIA">Média</option>
                              <option value="ALTA">Alta</option>
                              <option value="CRITICA">Crítica</option>
                            </select>
                            <svg className="select-status-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                          </span>
                        </label>
                        <button
                          type="button"
                          className="secondary-button small-button btn-salvar-prioridade"
                          onClick={handleSalvarPrioridade}
                          disabled={salvandoPrioridade || !prioridadeSelecionada || prioridadeSelecionada === prioridadeNormalizada}
                        >
                          {salvandoPrioridade ? 'Salvando...' : 'Salvar Prioridade'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p>Status atual: <strong>{statusExibido}</strong>. Acompanhe as etapas de resolução realizadas pela equipe técnica.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DetalhesEncerrados({ chamado, aoVoltar, onNovaMensagem, onReabrir, reabrindo }) {
  if (!chamado) {
    return <div className="panel empty-state">Nenhum chamado resolvido para exibir.</div>;
  }

  const tituloExibicao = chamado.tituloGeradoIa || chamado.classificacaoIa?.tituloGeradoIa || chamado.titulo || chamado.title;
  const descricao = chamado.descricao || chamado.description || 'Chamado encerrado com sucesso.';
  const dataResolucao = formatarData(chamado.resolvidoEm || chamado.resolvedAt || chamado.dataCriacao || chamado.abertoEm);
  const statusExibido = nomesStatus[codigosStatus[chamado.status] || chamado.status] || chamado.status;
  const classePrioridade = obterClassePrioridade(chamado?.prioridade || chamado?.priority);

  return (
    <div className="history-page-shell">
      <button type="button" className="ticket-back-link" onClick={aoVoltar}>
        <ArrowLeft size={14} aria-hidden="true" /> Voltar para chamados
      </button>
      <div className="history-shell panel">
        <div className="history-layout">
          <section className="history-main-content" aria-label="Informações do chamado">
            <div className="history-header-row">
              <span className="history-ticket-code">{chamado.protocolo || `#${chamado.id}`}</span>
              <div className="header-tags">
                <span className={`status-tag priority ${classePrioridade}`}>
                  {chamado.prioridade || chamado.priority}
                </span>
                <span className="status-tag done"><i aria-hidden="true" />{statusExibido}</span>
              </div>
            </div>

            <h1 className="history-title">{tituloExibicao}</h1>
            <p className="history-description">{descricao}</p>

            <PainelIa chamado={chamado} />

            <div className="history-people-row">
              <div className="history-person-box">
                <span className="history-person-label">Solicitante</span>
                <strong>{chamado.solicitanteNome || 'Cliente'}</strong>
                {chamado.solicitanteEmail && <small>{chamado.solicitanteEmail}</small>}
              </div>
              <div className="history-person-box">
                <span className="history-person-label">Técnico Responsável</span>
                <strong>{chamado.responsavelNome || 'Não atribuído'}</strong>
              </div>
            </div>

            <SecaoConversa
              chamado={chamado}
              onNovaMensagem={onNovaMensagem}
              onReabrir={onReabrir}
              reabrindo={reabrindo}
            />
            <SecaoAnexos anexos={chamado.anexos} />

            {chamado.notaAvaliacao && (
              <div className="history-rating">
                <h4>Avaliação do cliente</h4>
                <div className="stars" aria-label={`Avaliação ${chamado.notaAvaliacao} de 5`}>
                  {'★'.repeat(chamado.notaAvaliacao)}{'☆'.repeat(5 - chamado.notaAvaliacao)}
                </div>
                {chamado.comentarioAvaliacao && <p>{chamado.comentarioAvaliacao}</p>}
                <small>{formatarData(chamado.avaliadoEm || chamado.resolvidoEm)}</small>
              </div>
            )}
          </section>

          <aside className="history-sidebar">
            <div className="history-summary-card">
              <div className="summary-header">
                <span className="summary-label">LABWARE</span>
                <span className="summary-progress">Cumprido</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item"><span>Prioridade</span><strong>{chamado.prioridade || chamado.priority}</strong></div>
                <div className="summary-item"><span>Responsável</span><strong>{chamado.responsavelNome || 'Não atribuído'}</strong></div>
                <div className="summary-item"><span>Categoria</span><strong>{chamado.categoria || chamado.category}</strong></div>
                <div className="summary-item"><span>Origem</span><strong>{chamado.origem || 'PORTAL_TEXTO'}</strong></div>
                <div className="summary-item"><span>Concluído em</span><strong>{dataResolucao}</strong></div>
                <div className="summary-item"><span>Data de abertura</span><strong>{formatarData(chamado.dataCriacao || chamado.abertoEm)}</strong></div>
              </div>

              <button type="button" className="secondary-button wide-button" onClick={aoVoltar}>
                Voltar aos chamados
              </button>
            </div>

            <div className="history-info-card">
              <h4>Atendimento</h4>
              <p>Chamado encerrado. Reabra o atendimento caso necessite de novas atualizações.</p>
              {onReabrir && (
                <button
                  type="button"
                  className="primary-button wide-button"
                  onClick={onReabrir}
                  disabled={reabrindo}
                  style={{ marginTop: '10px' }}
                >
                  <RotateCcw size={14} /> {reabrindo ? 'Reabrindo chamado…' : 'Reabrir chamado'}
                </button>
              )}
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

  const codigo = id || ticketId;

  const [chamado, setChamado] = useState(null);
  const [loading, setLoading] = useState(Boolean(codigo));
  const [error, setError] = useState(codigo ? null : 'Código do chamado não fornecido.');
  const [reabrindo, setReabrindo] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!codigo) return;

    async function carregar() {
      try {
        setLoading(true);
        setError(null);
        const dados = await obterChamadoPorId(codigo);
        if (ativo) {
          setChamado(dados);
        }
      } catch (err) {
        if (ativo) {
          setError(err.message || 'Não foi possível carregar os dados do chamado.');
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
  }, [codigo]);

  const origem = caminho.split('/')[1];
  const destino = ['dashboard', 'chamados', 'meus-chamados', 'historico'].includes(origem)
    ? '/' + origem : '/chamados';
  const voltar = () => navegar(destino);

  const handleNovaMensagem = (novaMsg) => {
    setChamado(prev => {
      if (!prev) return prev;
      const historicoAtual = Array.isArray(prev.historico) ? prev.historico
        : Array.isArray(prev.historicoMensagens) ? prev.historicoMensagens : [];
      const novoHistorico = [...historicoAtual, novaMsg];
      return {
        ...prev,
        historico: novoHistorico,
        historicoMensagens: novoHistorico,
      };
    });
  };

  const handleReabrir = async () => {
    if (!codigo || reabrindo) return;
    setReabrindo(true);
    try {
      const atualizado = await reabrirChamado(codigo);
      setChamado(atualizado);
    } catch (err) {
      setError(err.message || 'Não foi possível reabrir o chamado.');
    } finally {
      setReabrindo(false);
    }
  };

  // RBAC no front-end
  const ehSuporte =
    usuario?.role === 'support' ||
    usuario?.perfil === 'SUPORTE' ||
    usuario?.perfil === 'ADMIN';

  const ehSolicitante =
    String(chamado?.ownerId) === String(usuario?.id) ||
    String(chamado?.solicitante?.id) === String(usuario?.id) ||
    String(chamado?.solicitanteId) === String(usuario?.id) ||
    (chamado?.solicitanteNome && (chamado.solicitanteNome === usuario?.nome || chamado.solicitanteNome === usuario?.name)) ||
    (usuario?.perfil === 'CLIENTE' && chamado !== null);

  const podeVisualizar = ehSuporte || ehSolicitante;
  const chamadoVisivel = podeVisualizar ? chamado : null;

  return (
    <div className="detalhes-chamado-page">
      {error && <p className="detalhes-aviso" role="alert">{error}</p>}
      {loading ? (
        <p className="panel empty-state" role="status">Carregando chamado…</p>
      ) : chamadoVisivel ? (
        <DetalhesEmAtendimento
          key={`${chamadoVisivel.id}-${chamadoVisivel.status}-${chamadoVisivel.prioridade}`}
          chamado={chamadoVisivel}
          aoVoltar={voltar}
          ehSuporte={ehSuporte}
          onNovaMensagem={handleNovaMensagem}
          onReabrir={handleReabrir}
          reabrindo={reabrindo}
          onChamadoAtualizado={setChamado}
        />
      ) : (
        <>
          <button type="button" className="ticket-back-link" onClick={voltar}>
            <ArrowLeft size={14} aria-hidden="true" /> Voltar para chamados
          </button>
          <p className="panel empty-state" role="status">
            Chamado não encontrado ou indisponível para este usuário.
          </p>
        </>
      )}
    </div>
  );
}
