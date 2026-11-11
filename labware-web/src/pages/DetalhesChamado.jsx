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
} from 'lucide-react';
import { useAutenticacao } from '../hooks/useAuth';
import { obterChamadoPorId, baixarArquivoAnexo, enviarMensagem } from '../services/ticketService';
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

function PainelIa({ chamado }) {
  if (!chamado?.justificativaIa && !chamado?.tituloGeradoIa && !chamado?.resumoTecnicoIa?.sintomaObservado) {
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
        <Sparkles size={14} />
        <strong>Triagem por Inteligência Artificial</strong>
      </div>
      {chamado.tituloGeradoIa && (
        <p className="ia-titulo-sugerido">
          <strong>Título técnico sugerido:</strong> {chamado.tituloGeradoIa}
        </p>
      )}
      {chamado.justificativaIa && (
        <p className="ia-justificativa">{chamado.justificativaIa}</p>
      )}
      {(chamado.resumoTecnicoIa?.sintomaObservado || chamado.resumoTecnicoIa?.impactoOperacional) && (
        <div className="ia-resumo-grid">
          {chamado.resumoTecnicoIa.sintomaObservado && (
            <div>
              <span className="ia-label">Sintoma observado:</span> {chamado.resumoTecnicoIa.sintomaObservado}
            </div>
          )}
          {chamado.resumoTecnicoIa.impactoOperacional && (
            <div>
              <span className="ia-label">Impacto operacional:</span> {chamado.resumoTecnicoIa.impactoOperacional}
            </div>
          )}
        </div>
      )}
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
            const tamanhoFormatado = anexo.tamanhoBytes
              ? `${(anexo.tamanhoBytes / (1024 * 1024)).toFixed(1)} MB`
              : '';

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

function SecaoConversa({ chamado, onNovaMensagem }) {
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
          <input
            type="text"
            aria-label="Nova mensagem"
            placeholder="Digite uma mensagem... (Pressione Enter para enviar)"
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
        </div>
      )}
      <div ref={fimConversaRef} />
    </div>
  );
}

function DetalhesEmAtendimento({ chamado, aoVoltar, ehSuporte, onNovaMensagem }) {
  const [novoStatus, definirNovoStatus] = useState('');
  const codigoAtual = codigosStatus[chamado?.status] || chamado?.status;
  const statusExibido = nomesStatus[novoStatus || codigoAtual] || chamado?.status;
  const classeStatus = statusExibido === 'Resolvido' || statusExibido === 'Fechado'
    ? 'done' : statusExibido === 'Aberto' ? 'open' : 'progress';

  if (!chamado) {
    return <div className="panel empty-state">Nenhum chamado para exibir.</div>;
  }

  if (['RESOLVIDO', 'FECHADO'].includes(codigoAtual)) {
    return <DetalhesEncerrados chamado={chamado} aoVoltar={aoVoltar} onNovaMensagem={onNovaMensagem} />;
  }

  const descricao = chamado.descricao || chamado.description || 'Sem descrição informada.';

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
                <span className="status-tag priority">{chamado.prioridade || chamado.priority}</span>
                <span className={`status-tag ${classeStatus}`}><i aria-hidden="true" />{statusExibido}</span>
              </div>
            </div>

            <h1 className="history-title">{chamado.titulo || chamado.title}</h1>
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

            <SecaoConversa chamado={chamado} onNovaMensagem={onNovaMensagem} />
            <SecaoAnexos anexos={chamado.anexos} />
          </section>

          <aside className="history-sidebar">
            <div className="history-summary-card">
              <div className="summary-header">
                <span className="summary-label">LABWARE</span>
                <span className={`status-tag ${classeStatus}`}><i aria-hidden="true" />{statusExibido}</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item"><span>SLA Estimado</span><strong>{chamado.sla || 'Sem SLA'}</strong></div>
                <div className="summary-item"><span>Tempo Restante</span><strong>{chamado.slaTempoRestanteFormatado || 'Em atendimento'}</strong></div>
                <div className="summary-item"><span>Prioridade</span><strong>{chamado.prioridade || chamado.priority}</strong></div>
                <div className="summary-item"><span>Responsável</span><strong>{chamado.responsavelNome || 'Não atribuído'}</strong></div>
                <div className="summary-item"><span>Categoria</span><strong>{chamado.categoria || chamado.category}</strong></div>
                <div className="summary-item"><span>Origem</span><strong>{chamado.origem || 'PORTAL_TEXTO'}</strong></div>
                <div className="summary-item"><span>Data de Abertura</span><strong>{formatarData(chamado.dataCriacao || chamado.abertoEm)}</strong></div>
                <div className="summary-item"><span>Prazo Limite</span><strong>{formatarData(chamado.prazoResolucao)}</strong></div>
              </div>
            </div>

            <div className="history-info-card">
              <h4>Atendimento</h4>
              {ehSuporte ? (
                <>
                  <p>Status atual: <strong>{statusExibido}</strong>. Atualize o status para manter o cliente informado.</p>
                  <div className="history-form-stack">
                    <div className="status-fixed-row">
                      <SelectStatus statusAtual={novoStatus || codigoAtual} valor="" aoAlterar={definirNovoStatus} />
                    </div>
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

function DetalhesEncerrados({ chamado, aoVoltar, onNovaMensagem }) {
  if (!chamado) {
    return <div className="panel empty-state">Nenhum chamado resolvido para exibir.</div>;
  }

  const descricao = chamado.descricao || chamado.description || 'Chamado encerrado com sucesso.';
  const dataResolucao = formatarData(chamado.resolvidoEm || chamado.resolvedAt || chamado.dataCriacao || chamado.abertoEm);
  const statusExibido = nomesStatus[codigosStatus[chamado.status] || chamado.status] || chamado.status;

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
                <span className="status-tag priority">{chamado.prioridade || chamado.priority}</span>
                <span className="status-tag done"><i aria-hidden="true" />{statusExibido}</span>
              </div>
            </div>

            <h1 className="history-title">{chamado.titulo || chamado.title}</h1>
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

            <SecaoConversa chamado={chamado} onNovaMensagem={onNovaMensagem} />
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
          key={`${chamadoVisivel.id}-${chamadoVisivel.status}`}
          chamado={chamadoVisivel}
          aoVoltar={voltar}
          ehSuporte={ehSuporte}
          onNovaMensagem={handleNovaMensagem}
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
