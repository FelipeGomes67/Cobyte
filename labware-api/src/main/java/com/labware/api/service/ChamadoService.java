package com.labware.api.service;

import com.labware.api.dto.response.ChamadoResponse;
import com.labware.api.dto.request.AbrirChamadoRequest;
import com.labware.api.dto.request.AlterarPrioridadeRequest;
import com.labware.api.dto.request.AlterarStatusRequest;
import com.labware.api.dto.request.AvaliacaoChamadoRequest;
import com.labware.api.dto.response.ClassificacaoIaResultadoReponse;
import com.labware.api.model.entity.Chamado;
import com.labware.api.model.entity.Avaliacao;
import com.labware.api.model.entity.ClassificacaoIa;
import com.labware.api.model.entity.HistoricoChamado;
import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.PerfilUsuario;
import com.labware.api.model.enums.Prioridade;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChamadoService {

    private final ChamadoRepository chamadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PoliticaSlaRepository politicaSlaRepository;
    private final ClassificacaoIaRepository classificacaoIaRepository;
    private final HistoricoChamadoRepository historicoRepository;
    private final ClassificadorIaService classificador;
    private final AcessoChamadoService acesso;
    private final TransactionTemplate tx;
    private final NotificacaoService notificacoes;
    private final LeituraChamadoService leituras;
    private final AnexoService anexos;
    private final SlaChamadoService sla;

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<ChamadoResponse> filtrar(Long usuarioId, String busca,
                                                                         StatusChamado status, Prioridade prioridade, com.labware.api.model.enums.OrigemChamado origem,
                                                                         Long responsavelId, boolean apenasMeus, Long solicitanteId, int page, int size) {
        Usuario u=buscarUsuario(usuarioId);
        acesso.exigirEmpresaVinculada(u);
        org.springframework.data.jpa.domain.Specification<Chamado> spec=(root,q,cb)->{
            var p=new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if(!acesso.ehSuporte(u)) p.add(cb.equal(root.get("solicitante").get("id"),usuarioId));
            else {
                if(solicitanteId!=null) p.add(cb.equal(root.get("solicitante").get("id"),solicitanteId));
                if(apenasMeus) p.add(cb.equal(root.get("responsavel").get("id"),usuarioId));
            }
            if(responsavelId!=null) p.add(cb.equal(root.get("responsavel").get("id"),responsavelId));
            if(status!=null) p.add(cb.equal(root.get("status"),status));
            if(prioridade!=null) p.add(cb.equal(root.get("prioridade"),prioridade));
            if(origem!=null) p.add(cb.equal(root.get("origem"),origem));
            if(busca!=null && !busca.isBlank()) {
                String termo=busca.trim().toLowerCase(java.util.Locale.ROOT);
                String like="%"+termo.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
                var texto=cb.or(cb.like(cb.lower(root.get("titulo")),like,'!'),cb.like(cb.lower(root.get("protocolo")),like,'!'));
                try { texto=cb.or(texto,cb.equal(root.get("id"),Long.parseLong(termo.replaceFirst("^#","")))); }
                catch(NumberFormatException ignored) { }
                p.add(texto);
            }
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        var pagina = chamadoRepository.findAll(spec, org.springframework.data.domain.PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "abertoEm", "id")));
        var classificacoes = buscarClassificacoes(pagina.getContent());
        return pagina.map(c -> ChamadoResponse.from(c, classificacoes.get(c.getId()), leituras.temNova(c.getId(), u)));
    }

    @Transactional
    public ChamadoResponse atribuir(Long id,Long usuarioId,Long tecnicoId) {
        Usuario autor=buscarUsuarioDoSuporte(usuarioId);
        Usuario tecnico=buscarUsuarioDoSuporte(tecnicoId);
        Chamado c=chamadoRepository.findParaAvaliacao(id).orElseThrow(()->new com.labware.api.exception.ResourceNotFoundException("Chamado não encontrado"));
        if(c.getStatus()==StatusChamado.RESOLVIDO || c.getStatus().finalizado())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Chamado já encerrado");
        registrarHistorico(c,autor,c.getResponsavel()==null?null:c.getResponsavel().getId().toString(),tecnicoId.toString());
        c.setResponsavel(tecnico);
        notificacoes.emitir(tecnico,usuarioId,c,"ATRIBUICAO","Chamado atribuído",c.getProtocolo());
        return toResponse(c);
    }

    @Transactional
    public ChamadoResponse reabrir(Long id,Long usuarioId) {
        Usuario u=buscarUsuario(usuarioId);
        acesso.exigirEmpresaVinculada(u);
        Chamado c=chamadoRepository.findParaAvaliacao(id).orElseThrow(()->new com.labware.api.exception.ResourceNotFoundException("Chamado não encontrado"));
        acesso.exigir(c,u);
        if(c.getStatus()!=StatusChamado.RESOLVIDO)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Somente chamados resolvidos podem ser reabertos; fechado e cancelado são finais");
        mudarStatus(c,u,StatusChamado.EM_ATENDIMENTO);
        return toResponse(c);
    }

    @Value("${spring.ai.ollama.chat.options.model}")
    private String modeloIa;

    // ---------------------------------------------------------------
    // Abertura
    // ---------------------------------------------------------------

    /** Abre o chamado, classifica com IA e calcula os prazos de SLA. */
    public ChamadoResponse abrir(Long solicitanteId, AbrirChamadoRequest req) {
        return abrir(solicitanteId, req, List.of());
    }

    public ChamadoResponse abrir(Long solicitanteId, AbrirChamadoRequest req,
                                 List<org.springframework.web.multipart.MultipartFile> arquivos) {
        return abrir(solicitanteId,req,arquivos,null);
    }

    public ChamadoResponse abrir(Long solicitanteId, AbrirChamadoRequest req,
                                 List<org.springframework.web.multipart.MultipartFile> arquivos,
                                 org.springframework.web.multipart.MultipartFile audio) {
        acesso.exigirEmpresaVinculada(buscarUsuario(solicitanteId));
        if(req.origem()==com.labware.api.model.enums.OrigemChamado.VOZ && (audio==null || audio.isEmpty()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Envie o áudio original junto ao chamado por voz");
        if(audio!=null) {
            String nome=audio.getOriginalFilename()==null?"":audio.getOriginalFilename().toLowerCase(java.util.Locale.ROOT);
            if(audio.isEmpty()||!nome.matches(".*\\.(wav|mp3|ogg|m4a|flac)$"))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Áudio original vazio ou em formato inválido");
        }
        if (arquivos == null || arquivos.isEmpty() || arquivos.stream().anyMatch(a -> a == null || a.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "É obrigatório anexar ao menos um documento ou imagem para abrir o chamado.");
        }
        // Falha rápida (sem gastar tempo de IA) se o solicitante não puder abrir chamados.
        exigirSolicitanteCliente(buscarUsuario(solicitanteId));

        // ETAPA 1 (Transação DB): Salva o chamado inicial e envia os anexos para obter o chamadoId
        Long chamadoId = tx.execute(status -> {
            Long id = criarChamado(solicitanteId, req);
            arquivos.forEach(arquivo -> anexos.enviar(id, solicitanteId, arquivo));
            if (audio != null) anexos.enviar(id, solicitanteId, audio);
            return id;
        });

        // ETAPA 2 (Fora da Transação): Executa a chamada do classificador IA
        final Optional<ClassificacaoIaResultadoReponse> ia = triarComIa(req);

        // ETAPA 3 (Transação DB): Grava prioridade, categoria, SLA e salva a entidade ClassificacaoIa
        try {
            return tx.execute(status -> aplicarClassificacao(chamadoId, ia));
        } catch (Exception e) {
            log.error("Erro ao aplicar classificação no chamado {}: {}. Tentando triagem padrão.", chamadoId, e.getMessage(), e);
            try {
                return tx.execute(status -> aplicarClassificacao(chamadoId, Optional.of(respostaPadraoIa())));
            } catch (Exception e2) {
                log.error("Triagem padrão também falhou no chamado {}: {}. Aplicando classificação mínima.", chamadoId, e2.getMessage(), e2);
                return tx.execute(status -> {
                    Chamado chamado = chamadoRepository.findById(chamadoId).orElseThrow();
                    if (chamado.getPrioridade() == null) {
                        chamado.setPrioridade(Prioridade.MEDIA);
                    }
                    if (chamado.getCategoria() == null) {
                        chamado.setCategoria(CategoriaChamado.DUVIDA);
                    }
                    if (chamado.getPrazoResolucao() == null && chamado.getPrioridade().minutosResolucao() != null) {
                        chamado.setPrazoResolucao(chamado.getAbertoEm().plusMinutes(chamado.getPrioridade().minutosResolucao()));
                    }
                    return toResponse(chamado);
                });
            }
        }
    }

    /** Executa a triagem fora de transação, respeitando labware.ia.timeout-ms; nunca lança, sempre devolve um resultado. */
    private Optional<ClassificacaoIaResultadoReponse> triarComIa(AbrirChamadoRequest req) {
        return classificador.classificar(req.titulo(), req.descricao());
    }

    private ClassificacaoIaResultadoReponse respostaPadraoIa() {
        return new ClassificacaoIaResultadoReponse(
                Prioridade.MEDIA,
                CategoriaChamado.DUVIDA,
                "Triagem padrão aplicada devido a indisponibilidade/falha de resposta da IA."
        );
    }

    // ---------------------------------------------------------------
    // Consultas
    // ---------------------------------------------------------------

    /** CLIENTE: só os próprios (o filtro é ignorado). SUPORTE/ADMIN: todos, com filtro opcional. */
    @Transactional(readOnly = true)
    public List<ChamadoResponse> listar(Long usuarioId, Long solicitanteIdFiltro) {
        Usuario usuario = buscarUsuario(usuarioId);
        acesso.exigirEmpresaVinculada(usuario);

        List<Chamado> chamados;
        if (acesso.ehSuporte(usuario)) {
            chamados = solicitanteIdFiltro != null
                    ? chamadoRepository.findBySolicitanteIdOrderByAbertoEmDesc(solicitanteIdFiltro)
                    : chamadoRepository.findAll(Sort.by(Sort.Direction.DESC, "abertoEm"));
        } else {
            chamados = chamadoRepository.findBySolicitanteIdOrderByAbertoEmDesc(usuario.getId());
        }
        var classificacoes = buscarClassificacoes(chamados);
        return chamados.stream().map(c -> ChamadoResponse.from(c, classificacoes.get(c.getId()), false)).toList();
    }

    @Transactional(readOnly = true)
    public ChamadoResponse buscar(Long chamadoId, Long usuarioId) {
        Chamado chamado = buscarEntidade(chamadoId);
        acesso.exigir(chamado, buscarUsuario(usuarioId));
        return ChamadoResponse.from(chamado,
                classificacaoIaRepository.findByChamadoId(chamadoId).orElse(null),
                leituras.temNova(chamadoId, buscarUsuario(usuarioId)));
    }

    // ---------------------------------------------------------------
    // Ciclo de vida (suporte)
    // ---------------------------------------------------------------

    @Transactional
    public ChamadoResponse assumir(Long chamadoId, Long usuarioId) {
        Chamado chamado = chamadoRepository.findParaAvaliacao(chamadoId)
                .orElseThrow(() -> new com.labware.api.exception.ResourceNotFoundException("Chamado não encontrado"));
        Usuario usuario = buscarUsuarioDoSuporte(usuarioId);

        if (chamado.getStatus() == StatusChamado.RESOLVIDO || chamado.getStatus().finalizado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chamado já encerrado");
        }

        Usuario atual = chamado.getResponsavel();
        if (atual != null && !atual.getId().equals(usuario.getId())
                && usuario.getPerfil() != PerfilUsuario.ADMIN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Chamado já está com " + atual.getNome());
        }

        String anterior = atual != null ? atual.getNome() : null;
        chamado.setResponsavel(usuario);
        registrarHistorico(chamado, usuario, anterior, usuario.getNome());

        if (chamado.getStatus() == StatusChamado.ABERTO) {
            mudarStatus(chamado, usuario, StatusChamado.EM_ANALISE);
        } else {
            chamadoRepository.save(chamado);
        }
        return toResponse(chamado);
    }

    @Transactional
    public ChamadoResponse alterarStatus(Long chamadoId, Long usuarioId, AlterarStatusRequest req) {
        Chamado chamado = chamadoRepository.findParaAvaliacao(chamadoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chamado não encontrado"));
        Usuario usuario = buscarUsuario(usuarioId);
        acesso.exigir(chamado, usuario);
        StatusChamado atual = chamado.getStatus();
        StatusChamado novo = req.novoStatus();
        if (atual.finalizado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chamado em estado final não pode ser alterado");
        }
        boolean cliente = usuario.getPerfil() == PerfilUsuario.CLIENTE;
        if (cliente && novo != StatusChamado.CANCELADO && novo != StatusChamado.FECHADO) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitante pode cancelar ou confirmar a resolução");
        }
        if (novo == StatusChamado.FECHADO && !cliente) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O fechamento deve ser confirmado pelo solicitante");
        }
        if (atual != novo && !atual.podeIrPara(novo)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição inválida: " + atual.codigo() + " -> " + (novo == null ? "" : novo.codigo()));
        }
        if (atual == novo) return toResponse(chamado);
        if (!cliente) {
            Usuario responsavel = chamado.getResponsavel();
            if (responsavel != null && !responsavel.getId().equals(usuario.getId()) && usuario.getPerfil() != PerfilUsuario.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente o responsável ou ADMIN pode alterar o status");
            }
            if (responsavel == null) {
                chamado.setResponsavel(usuario);
                registrarHistorico(chamado, usuario, null, usuario.getNome());
            }
        }
        String motivo = null;
        if (novo == StatusChamado.CANCELADO) {
            motivo = req.motivoCancelamento() == null ? "" : req.motivoCancelamento().trim();
            if (motivo.length() < 10 || motivo.length() > 4000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um relatório de cancelamento entre 10 e 4000 caracteres");
            }
            chamado.setMotivoCancelamento(motivo);
            chamado.setCanceladoEm(LocalDateTime.now());
            chamado.setCanceladoPor(usuario);
        }
        mudarStatus(chamado, usuario, novo, motivo);
        return toResponse(chamado);
    }

    @Transactional
    public ChamadoResponse alterarPrioridade(Long chamadoId, Long usuarioId, AlterarPrioridadeRequest req) {
        Chamado chamado = chamadoRepository.findParaAvaliacao(chamadoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chamado não encontrado"));
        Usuario usuario = buscarUsuarioDoSuporte(usuarioId);

        if (chamado.getStatus() != StatusChamado.EM_ANALISE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prioridade só pode ser alterada em Em Análise");
        }
        Prioridade anterior = chamado.getPrioridade();
        Prioridade nova = req.novaPrioridade();
        if (nova == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova prioridade não pode ser nula");
        }

        if (anterior == nova) return toResponse(chamado);

        chamado.setPrioridade(nova);
        if (nova.minutosResolucao() != null && chamado.getAbertoEm() != null) {
            chamado.setPrazoResolucao(chamado.getAbertoEm().plusMinutes(nova.minutosResolucao()).plus(chamado.duracaoPausasEncerradas()));
        } else {
            chamado.setPrazoResolucao(null);
        }

        registrarHistorico(chamado, usuario, anterior != null ? anterior.name() : null, nova.name());
        chamadoRepository.save(chamado);
        return toResponse(chamado);
    }

    @Transactional
    public ChamadoResponse avaliarChamado(Long id, AvaliacaoChamadoRequest dto, Long usuarioId) {
        return avaliarChamado(id, dto, buscarUsuario(usuarioId));
    }

    /** O bloqueio serializa avaliações concorrentes para impedir sobrescrita da primeira nota. */
    @Transactional
    public ChamadoResponse avaliarChamado(Long id, AvaliacaoChamadoRequest dto, Usuario usuarioAutenticado) {
        Chamado chamado = chamadoRepository.findParaAvaliacao(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chamado não encontrado"));
        if (usuarioAutenticado.getPerfil() != PerfilUsuario.CLIENTE
                || !chamado.getSolicitante().getId().equals(usuarioAutenticado.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Somente o cliente solicitante pode avaliar o chamado");
        }
        if (chamado.getStatus() != StatusChamado.RESOLVIDO && chamado.getStatus() != StatusChamado.FECHADO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Somente chamados resolvidos ou fechados podem ser avaliados");
        }
        if (chamado.getAvaliacao() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chamado já avaliado");
        }

        chamado.setAvaliacao(Avaliacao.builder()
                .notaAvaliacao(dto.notaAvaliacao())
                .comentarioAvaliacao(dto.comentarioAvaliacao())
                .avaliadoEm(LocalDateTime.now()).build());
        registrarHistorico(chamado, usuarioAutenticado, null, dto.notaAvaliacao().toString());
        if (chamado.getStatus() == StatusChamado.RESOLVIDO) {
            mudarStatus(chamado, usuarioAutenticado, StatusChamado.FECHADO);
        }
        chamadoRepository.save(chamado);
        return toResponse(chamado);
    }

    // ---------------------------------------------------------------
    // Internos
    // ---------------------------------------------------------------

    private Long criarChamado(Long solicitanteId, AbrirChamadoRequest req) {
        Usuario solicitante = buscarUsuario(solicitanteId);

        if(req.duracaoAudioSegundos()!=null && (!Double.isFinite(req.duracaoAudioSegundos()) || req.duracaoAudioSegundos()<0))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Duração de áudio inválida");

        exigirSolicitanteCliente(solicitante);

        Chamado chamado = chamadoRepository.save(Chamado.builder()
                // protocolo provisório (a coluna é única e obrigatória); o definitivo usa o id
                .protocolo("TMP-" + UUID.randomUUID().toString().substring(0, 15))
                .titulo(req.titulo())
                .descricao(req.descricao())
                .origem(req.origem()!=null ? req.origem() : com.labware.api.model.enums.OrigemChamado.TEXTO)
                .duracaoAudioSegundos(req.duracaoAudioSegundos())
                .empresa(solicitante.getEmpresa())
                .solicitante(solicitante)
                .build());

        chamado.setProtocolo(String.format("LAB-%d-%05d", Year.now().getValue(), chamado.getId()));
        registrarHistorico(chamado, solicitante, null, chamado.getStatus().name());
        return chamado.getId();
    }

    private void exigirSolicitanteCliente(Usuario solicitante) {
        if (solicitante.getPerfil() != PerfilUsuario.CLIENTE || solicitante.getEmpresa() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Somente usuários CLIENTE vinculados a uma empresa podem abrir chamados");
        }
    }

    private ChamadoResponse aplicarClassificacao(Long chamadoId, Optional<ClassificacaoIaResultadoReponse> ia) {
        Chamado chamado = chamadoRepository.findParaAvaliacao(chamadoId).orElseThrow();
        if (chamado.getStatus().finalizado()) return toResponse(chamado);

        // Se a IA falhar ou não devolver prioridade/categoria, usa MEDIA e DUVIDA para o SLA e classificação
        Prioridade prioridade = ia.map(ClassificacaoIaResultadoReponse::prioridade).filter(java.util.Objects::nonNull).orElse(Prioridade.MEDIA);
        CategoriaChamado categoria = ia.map(ClassificacaoIaResultadoReponse::categoria).filter(java.util.Objects::nonNull).orElse(CategoriaChamado.DUVIDA);

        chamado.setPrioridade(prioridade);
        chamado.setCategoria(categoria);

        chamado.setPrazoPrimeiraResposta(null);
        chamado.setPrazoResolucao(null);
        if (prioridade.minutosResolucao() != null) {
            // A regra vigente prevalece sobre políticas antigas já existentes no banco.
            chamado.setPrazoResolucao(chamado.getAbertoEm().plusMinutes(prioridade.minutosResolucao()));
            politicaSlaRepository.findByPrioridade(prioridade).ifPresentOrElse(
                    p -> chamado.setPrazoPrimeiraResposta(chamado.getAbertoEm().plusMinutes(p.getMinutosPrimeiraResposta())),
                    () -> chamado.setPrazoPrimeiraResposta(chamado.getAbertoEm().plusMinutes(120))
            );
        }
        try {
            atribuirAutomaticamente(chamado);
        } catch (Exception e) {
            log.error("Falha ao atribuir automaticamente o chamado {}: {}", chamado.getProtocolo(), e.getMessage());
        }

        // Auditoria da triagem (justificativa + SLA em minutos). Sem try/catch: se falhar, a transação inteira
        // é revertida e abrir() aplica a triagem padrão, em vez de salvar o chamado sem justificativa.
        ia.ifPresent(r -> classificacaoIaRepository.save(ClassificacaoIa.builder()
                .chamado(chamado)
                .categoriaSugerida(r.categoria() != null ? r.categoria() : categoria)
                .prioridadeSugerida(r.prioridade() != null ? r.prioridade() : prioridade)
                .justificativa(r.justificativa() != null && !r.justificativa().isBlank()
                        ? r.justificativa() : "Classificação automática padrão.")
                .modelo(modeloIa)
                .tituloGeradoIa(r.tituloGeradoIa())
                .sintomaObservadoIa(r.resumoTecnicoIa()==null?null:r.resumoTecnicoIa().sintomaObservado())
                .impactoOperacionalIa(r.resumoTecnicoIa()==null?null:r.resumoTecnicoIa().impactoOperacional())
                .slaMetaMinutos(prioridade.minutosResolucao())
                .build()));

        try {
            registrarHistorico(chamado, null, null, prioridade.name());
        } catch (Exception e) {
            log.error("Falha ao registrar histórico do chamado {}: {}", chamado.getProtocolo(), e.getMessage());
        }
        // A triagem classifica; o chamado permanece aberto ate o suporte assumir.
        return toResponse(chamado);
    }

    private void atribuirAutomaticamente(Chamado chamado) {
        if (chamado.getResponsavel() != null) return;
        var encerrados = List.of(StatusChamado.RESOLVIDO, StatusChamado.FECHADO, StatusChamado.CANCELADO);
        usuarioRepository.buscarSuportesParaDistribuicao().stream()
                .min(java.util.Comparator.<Usuario>comparingLong(u ->
                                chamadoRepository.countByResponsavelIdAndStatusNotIn(u.getId(), encerrados))
                        .thenComparing(Usuario::getId))
                .ifPresent(suporte -> {
                    chamado.setResponsavel(suporte);
                    try {
                        registrarHistorico(chamado, null, null, "ATRIBUICAO_AUTOMATICA:" + suporte.getId());
                    } catch (Exception e) {
                        log.error("Falha ao registrar histórico de atribuição automática: {}", e.getMessage());
                    }
                    try {
                        notificacoes.emitir(suporte, null, chamado, "ATRIBUICAO", "Chamado atribuído automaticamente", chamado.getProtocolo());
                    } catch (Exception e) {
                        log.error("Falha ao emitir notificação de atribuição automática: {}", e.getMessage());
                    }
                });
    }

    private void mudarStatus(Chamado chamado, Usuario usuario, StatusChamado novo) {
        mudarStatus(chamado, usuario, novo, null);
    }

    private void mudarStatus(Chamado chamado, Usuario usuario, StatusChamado novo, String observacao) {
        if (!chamado.getStatus().podeIrPara(novo)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição de status não permitida");
        }
        StatusChamado anterior = chamado.getStatus();
        sla.aoAlterarStatus(chamado, usuario, novo);
        chamado.setStatus(novo);

        if (novo == StatusChamado.RESOLVIDO) {
            chamado.setResolvidoEm(LocalDateTime.now());
        } else if ((anterior == StatusChamado.RESOLVIDO || anterior == StatusChamado.FECHADO) && novo == StatusChamado.EM_ATENDIMENTO) {
            chamado.setResolvidoEm(null); // chamado reaberto
        }
        historicoRepository.save(HistoricoChamado.builder().chamado(chamado).usuario(usuario)
                .valorAnterior(anterior.codigo()).valorNovo(novo.codigo()).observacao(observacao).build());
        notificacoes.emitir(chamado.getSolicitante(),usuario.getId(),chamado,"STATUS","Status atualizado",chamado.getProtocolo()+" · "+novo.name());
        if(chamado.getResponsavel()!=null)
            notificacoes.emitir(chamado.getResponsavel(),usuario.getId(),chamado,"STATUS","Status atualizado",chamado.getProtocolo()+" · "+novo.name());
        else notificacoes.emitirParaSuportes(usuario.getId(),chamado,"STATUS","Status atualizado",chamado.getProtocolo()+" · "+novo.name());
    }

    private Chamado buscarEntidade(Long id) {
        return chamadoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chamado não encontrado"));
    }

    private Usuario buscarUsuario(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
    }

    private Usuario buscarUsuarioDoSuporte(Long usuarioId) {
        Usuario usuario = buscarUsuario(usuarioId);
        acesso.exigirEmpresaVinculada(usuario);
        if (!acesso.ehSuporte(usuario)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Somente SUPORTE ou ADMIN podem executar esta ação");
        }
        return usuario;
    }

    private java.util.Map<Long, ClassificacaoIa> buscarClassificacoes(List<Chamado> chamados) {
        if (chamados.isEmpty()) return java.util.Map.of();
        return classificacaoIaRepository.findByChamadoIdIn(chamados.stream().map(Chamado::getId).toList())
                .stream().collect(java.util.stream.Collectors.toMap(ia -> ia.getChamado().getId(), ia -> ia));
    }

    private ChamadoResponse toResponse(Chamado chamado) {
        return ChamadoResponse.from(chamado,
                classificacaoIaRepository.findByChamadoId(chamado.getId()).orElse(null), false);
    }

    private void registrarHistorico(Chamado chamado, Usuario usuario, String anterior, String novo) {
        historicoRepository.save(HistoricoChamado.builder()
                .chamado(chamado)
                .usuario(usuario)
                .valorAnterior(anterior)
                .valorNovo(novo)
                .build());
    }
}