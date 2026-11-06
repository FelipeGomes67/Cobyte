import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTicketById, addMessageToTicket } from '../data/mockDatabase';
import '../css/DetalhesChamado.css';

export default function DetalhesChamado() {
  const { id } = useParams();
  const [chamado, setChamado] = useState(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [tempo, setTempo] = useState(43103);

  const [rating, setRating] = useState('5');
  const [comentario, setComentario] = useState('');
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [dadosAvaliacao, setDadosAvaliacao] = useState(null);

  useEffect(() => {
    const ticket = getTicketById(id);
    if (ticket) {
      setChamado(ticket);
    }
  }, [id]);

  useEffect(() => {
    if (chamado?.status === 'Resolvido') return;

    const interval = setInterval(() => {
      setTempo((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [chamado]);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleEnviarMensagem = (e) => {
    e.preventDefault();
    if (!novaMensagem.trim()) return;

    const ticketAtualizado = addMessageToTicket(chamado.id, novaMensagem);
    setChamado(ticketAtualizado);
    setNovaMensagem('');
  };

  const handleBaixarEvidencia = (nomeArquivo) => {
    const conteudo = `Conteúdo demonstrativo da evidência: ${nomeArquivo}`;
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo || 'evidencia.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEnviarAvaliacao = (e) => {
    e.preventDefault();
    const avaliacao = {
      qtdEstrelas: parseInt(rating, 10),
      comentario: comentario.trim()
    };
    setDadosAvaliacao(avaliacao);
    setAvaliacaoEnviada(true);
  };

  if (!chamado) return null;

  const isResolvido = chamado.status === 'Resolvido';

  return (
    <div className="detalhes-chamado-container">
      <header className="detalhes-header">
        <span className="subtitulo-app">Suporte Labware</span>
        <h1>Detalhes</h1>
      </header>

      <div className="detalhes-grid">
        <div className="coluna-principal">
          
          <section className="card-detalhe">
            <div className="tags-linha">
              <span className="tag-pill tag-azul">{chamado.codigo || chamado.id}</span>
              <span className="tag-pill tag-azul">{chamado.status}</span>
              <span className="tag-pill tag-sistema">{chamado.sistema || 'LABWARE'}</span>
            </div>

            <h2 className="titulo-chamado">{chamado.title || chamado.titulo}</h2>
            <p className="descricao-chamado">{chamado.description || chamado.descricao}</p>

            <div className="grid-dados-solicitacao">
              <div className="box-dado">
                <span className="label-dado">Solicitante</span>
                <strong className="valor-dado">{chamado.solicitante}</strong>
              </div>
              <div className="box-dado">
                <span className="label-dado">Empresa</span>
                <strong className="valor-dado">{chamado.empresa}</strong>
              </div>
              <div className="box-dado">
                <span className="label-dado">Equipamento</span>
                <strong className="valor-dado">{chamado.equipamento || 'Não informado'}</strong>
              </div>
              <div className="box-dado">
                <span className="label-dado">Data</span>
                <strong className="valor-dado">{chamado.data}</strong>
              </div>
            </div>
          </section>

          <section className="card-detalhe">
            <div className="header-conversa">
              <h3>Conversa ({chamado.mensagens?.length || 0})</h3>
              <span className="texto-filtro">Última resposta</span>
            </div>

            {chamado.mensagens?.map((msg) => (
              <div key={msg.id} className="item-mensagem">
                <div className="header-mensagem">
                  <div className="avatar-sigla">
                    {msg.autor ? msg.autor.substring(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div className="info-autor">
                    <strong>{msg.autor}</strong>
                    <span>{msg.data}</span>
                  </div>
                  <span className="tag-cargo">{msg.cargo || 'SUPORTE'}</span>
                </div>
                <div className="corpo-mensagem">{msg.texto}</div>
              </div>
            ))}

            <form onSubmit={handleEnviarMensagem} className="box-nova-mensagem">
              <label className="label-campo">Nova Mensagem</label>
              <div className="input-textarea-wrapper">
                <textarea 
                  placeholder="Escreva sua mensagem..."
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                />
                <button type="submit" className="btn-enviar-mensagem">Enviar mensagem</button>
              </div>
              <label className="checkbox-nota-interna">
                <input type="checkbox" /> Nota interna
              </label>
            </form>
          </section>

          {chamado.evidencias?.length > 0 && (
            <section className="card-detalhe">
              <h3>Evidências</h3>
              {chamado.evidencias.map((ev, i) => (
                <div key={i} className="item-evidencia">
                  <div className="icone-evidencia-box">
                    <img src="/icons/file.svg" alt="Arquivo" />
                  </div>
                  <div className="info-evidencia">
                    <strong>{ev.nome || ev}</strong>
                    <span>{ev.tipo || 'Arquivo'}</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-baixar-evidencia"
                    onClick={() => handleBaixarEvidencia(ev.nome || ev)}
                  >
                    ⬇ Baixar
                  </button>
                </div>
              ))}
            </section>
          )}

        </div>

        <aside className="coluna-lateral">
          <div className="card-detalhe">
            <h3>Acompanhamento</h3>

            {isResolvido ? (
              <div className="box-timer-sla cumprido">
                <div className="info-sla-cumprido">
                  <div className="icone-relogio-verde">
                    <img src="/icons/clock.svg" alt="Relógio" />
                  </div>
                  <div>
                    <strong className="titulo-sla-verde">SLA {chamado.sla || '12h'}</strong>
                    <span className="sub-sla-verde">Concluído no prazo</span>
                  </div>
                </div>
                <span className="tag-cumprido">CUMPRIDO</span>
              </div>
            ) : (
              <div className="box-timer-sla">
                <span className="titulo-sla">SLA de {chamado.sla || '12h'}</span>
                <div className="cronometro-sla">{formatarTempo(tempo)}</div>
                <span className="sub-sla">TEMPO RESTANTE</span>
              </div>
            )}

            <div className="lista-status-lateral">
              <div className="box-dado">
                <span className="label-dado">Prioridade</span>
                <strong className="valor-dado">{chamado.prioridade || chamado.priority || 'MÉDIA'}</strong>
              </div>
              <div className="box-dado">
                <span className="label-dado">Responsável</span>
                <strong className="valor-dado">{chamado.responsavel || 'Não atribuído'}</strong>
              </div>
              <div className="box-dado">
                <span className="label-dado">Categoria</span>
                <strong className="valor-dado">{chamado.categoria || chamado.category || 'Pendente'}</strong>
              </div>
            </div>
          </div>

          {isResolvido && (
            <div className="card-detalhe card-atendimento">
              <h3>Atendimento</h3>

              {!avaliacaoEnviada ? (
                <form onSubmit={handleEnviarAvaliacao}>
                  <div className="campo-atendimento">
                    <label className="label-atendimento">Como foi o atendimento?</label>
                    <select 
                      className="select-atendimento"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    >
                      <option value="5">5 estrelas</option>
                      <option value="4">4 estrelas</option>
                      <option value="3">3 estrelas</option>
                      <option value="2">2 estrelas</option>
                      <option value="1">1 estrela</option>
                    </select>
                  </div>

                  <div className="campo-atendimento">
                    <label className="label-atendimento">Comentário opcional</label>
                    <textarea 
                      className="textarea-atendimento"
                      placeholder="Escreva seu comentário..."
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-enviar-avaliacao">
                    Enviar avaliação
                  </button>
                </form>
              ) : (
                <div className="avaliacao-registrada">
                  <div className="estrelas-linha">
                    {[...Array(dadosAvaliacao?.qtdEstrelas || 5)].map((_, index) => (
                      <img 
                        key={index} 
                        src="/icons/andrsrxn_star-filled.svg" 
                        alt="Estrela" 
                        className="icone-estrela" 
                      />
                    ))}
                  </div>
                  {dadosAvaliacao?.comentario ? (
                    <p className="comentario-registrado">{dadosAvaliacao.comentario}</p>
                  ) : (
                    <p className="sem-comentario">Sem comentário registrado.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}