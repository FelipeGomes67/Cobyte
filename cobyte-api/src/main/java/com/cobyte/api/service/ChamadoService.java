package com.cobyte.api.service;

import com.cobyte.api.dto.response.ChamadoResponse;
import com.cobyte.api.exception.ResourceNotFoundException;
import com.cobyte.api.dto.request.AbrirChamadoRequest;
import com.cobyte.api.dto.request.AlterarPrioridadeRequest;
import com.cobyte.api.dto.request.AlterarStatusRequest;
import com.cobyte.api.dto.request.AvaliacaoChamadoRequest;
import com.cobyte.api.dto.response.ClassificacaoIaResultadoReponse;
import com.cobyte.api.model.entity.Chamado;
import com.cobyte.api.model.entity.Avaliacao;
import com.cobyte.api.model.entity.ClassificacaoIa;
import com.cobyte.api.model.entity.HistoricoChamado;
import com.cobyte.api.model.entity.Usuario;
import com.cobyte.api.model.enums.CategoriaChamado;
import com.cobyte.api.model.enums.PerfilUsuario;
import com.cobyte.api.model.enums.Prioridade;
import com.cobyte.api.model.enums.StatusChamado;
import com.cobyte.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChamadoService {

    private static final SecureRandom ALEATORIO = new SecureRandom();
    private static final String ALFABETO_PROTOCOLO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

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
                                                                         StatusChamado status, Prioridade prioridade, com.cobyte.api.model.enums.OrigemChamado origem,
                                                                         Long responsavelId, boolean apenasMeus, Long solicitanteId, int page, int size) {
        Usuario u=buscarUsuario(usuarioId);
        acesso.exigirEmpresaVinculada(u);
        org.springframework.data.jpa.domain.Specification<Chamado> spec=(root,q,cb)->{
            var p=new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (!acesso.ehSuporte(u)) {
                p.add(cb.equal(root.get("solicitante").get("id"), usuarioId));
                p.add(cb.equal(root.get("empresa").get("id"), u.getEmpresa().getId()));
            }
            else {
                if(solicitanteId!=null) p.add(cb.equal(root.get("solicitante").get("id"),solicitanteId));
                if(apenasMeus) {
                    q.distinct(true);
                    p.add(cb.or(cb.equal(root.get("responsavel").get("id"),usuarioId),
                            cb.equal(root.join("tecnicos", jakarta.persistence.criteria.JoinType.LEFT).get("id"),usuarioId)));
                }
            }
            if(responsavelId!=null) {
                q.distinct(true);
                p.add(cb.or(cb.equal(root.get("responsavel").get("id"),responsavelId),
                        cb.equal(root.join("tecnicos", jakarta.persistence.criteria.JoinType.LEFT).get("id"),responsavelId)));
            }
            if(status!=null) p.add(cb.equal(root.get("status"),status));
            if(prioridade!=null) p.add(cb.equal(root.get("prioridade"),prioridade));
            if(origem!=null) p.add(cb.equal(root.get("origem"),origem));
            if(busca!=null && !busca.isBlank()) {
                String termo=busca.trim().toLowerCase(java.util.Locale.ROOT);
                String like="%"+termo.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
                var texto=cb.or(cb.like(cb.lower(root.get("titulo")),like,'!'),cb.like(cb.lower(root.get("protocolo")),like,'!'));
                try { texto=cb.or(texto,cb.equal(root.get("idPublico"),UUID.fromString(termo))); }
                catch(IllegalArgumentException ignored) { }
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
        Chamado c=chamadoRepository.findParaAvaliacao(id).orElseThrow(()->new com.cobyte.api.exception.ResourceNotFoundException("Chamado não encontrado"));
        acesso.exigirEdicao(c, autor);
        if(c.getStatus()==StatusChamado.RESOLVIDO || c.getStatus().finalizado())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Chamado já encerrado");
        registrarHistorico(c,autor,c.getResponsavel()==null?null:c.getResponsavel().getId().toString(),tecnicoId.toString());
        c.adicionarTecnico(tecnico);
        c.setResponsavel(tecnico);
        String detalheAtribuicao = "Chamado atribuído para o responsável " + tecnico.getNome();
        String prazo = c.getPrazoResolucao() != null ? "Prazo estimado de resolução: " + c.getPrazoResolucao().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : null;
        notificacoes.emitir(tecnico, usuarioId, c, "ATRIBUICAO", "Chamado atribuído", detalheAtribuicao, autor.getNome(), prazo);
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public List<ChamadoResponse> listarDaEmpresa(Long usuarioId, Long empresaId) {
        Usuario usuario = buscarUsuario(usuarioId);
        if (usuario.getPerfil() != PerfilUsuario.CLIENTE || usuario.getEmpresa() == null
                || !usuario.getEmpresa().getId().equals(empresaId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só pode consultar chamados da sua empresa.");
        }
        var chamados = chamadoRepository.findByEmpresaIdOrderByAbertoEmDesc(empresaId);
        var classificacoes = buscarClassificacoes(chamados);
        return chamados.stream().map(c -> ChamadoResponse.from(c, classificacoes.get(c.getId()), false)).toList();
    }

    @Transactional
    public ChamadoResponse reabrir(Long id,Long usuarioId) {
        Usuario u=buscarUsuario(usuarioId);
        acesso.exigirEmpresaVinculada(u);
        Chamado c=chamadoRepository.findParaAvaliacao(id).orElseThrow(()->new com.cobyte.api.exception.ResourceNotFoundException("Chamado não encontrado"));
        acesso.exigirEdicao(c,u);
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
        if(req.origem()==com.cobyte.api.model.enums.OrigemChamado.VOZ && (audio==null || audio.isEmpty()))
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
                    return toResponse(chamado);
                });
            }
        }
    }

    /** Executa a triagem fora de transação, respeitando cobyte.ia.timeout-ms; nunca lança, sempre devolve um resultado. */
    private Optional<ClassificacaoIaResultadoReponse> triarComIa(AbrirChamadoRequest req) {
        return classificador.classificar(req.titulo(), req.descricao());
    }

    private ClassificacaoIaResultadoReponse respostaPadraoIa() {
        return new ClassificacaoIaResultadoReponse(
                null, null,
                "[Revisão necessária] Triagem indisponível. Categoria e prioridade aguardam análise do suporte."
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
            chamados = chamadoRepository.findBySolicitanteIdAndEmpresaIdOrderByAbertoEmDesc(
                    usuario.getId(), usuario.getEmpresa().getId());
        }
        var classificacoes = buscarClassificacoes(chamados);
        return chamados.stream().map(c -> ChamadoResponse.from(c, classificacoes.get(c.getId()), false)).toList();
    }

    @Transactional(readOnly = true)
    public ChamadoResponse buscar(Long chamadoId, Long usuarioId) {
        Chamado chamado = buscarEntidade(chamadoId);
        acesso.exigirLeitura(chamado, buscarUsuario(usuarioId));
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
                .orElseThrow(() -> new com.cobyte.api.exception.ResourceNotFoundException("Chamado não encontrado"));
        Usuario usuario = buscarUsuarioDoSuporte(usuarioId);

        if (chamado.getStatus() == StatusChamado.RESOLVIDO || chamado.getStatus().finalizado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chamado já encerrado");
        }

        if (!chamado.possuiTecnico(usuario.getId())) {
            String anterior = chamado.getResponsavel() != null ? chamado.getResponsavel().getNome() : null;
            chamado.adicionarTecnico(usuario);
            registrarHistorico(chamado, usuario, anterior, "Técnico adicionado: " + usuario.getNome());
        }

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
        acesso.exigirEdicao(chamado, usuario);
        StatusChamado atual = chamado.getStatus();
        StatusChamado novo = req.novoStatus();
        if (atual.finalizado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chamado em estado final não pode ser alterado");
        }
        boolean cliente = usuario.getPerfil() == PerfilUsuario.CLIENTE;
        if (cliente && novo != StatusChamado.CANCELADO && novo != StatusChamado.FECHADO) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Clientes da empresa podem cancelar ou confirmar a resolução");
        }
        if (novo == StatusChamado.FECHADO && !cliente) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O fechamento deve ser confirmado por um cliente da empresa");
        }
        if (atual != novo && !atual.podeIrPara(novo)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição inválida: " + atual.codigo() + " -> " + (novo == null ? "" : novo.codigo()));
        }
        if (atual == novo) return toResponse(chamado);
        if (!cliente) {
            Usuario responsavel = chamado.getResponsavel();
            if (responsavel != null && !chamado.possuiTecnico(usuario.getId()) && usuario.getPerfil() != PerfilUsuario.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente os técnicos do chamado ou ADMIN podem alterar o status");
            }
            if (responsavel == null) {
                chamado.adicionarTecnico(usuario);
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

        if (!chamado.possuiTecnico(usuarioId) && usuario.getPerfil() != PerfilUsuario.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente técnicos do chamado podem alterar a prioridade");
        }

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
        classificacaoIaRepository.findByChamadoId(chamadoId).ifPresent(ia -> ia.setPrioridadeFinal(nova));
        if (nova.minutosResolucao() != null && chamado.getAbertoEm() != null) {
            chamado.setPrazoResolucao(chamado.getAbertoEm().plusMinutes(nova.minutosResolucao()).plus(chamado.duracaoPausasEncerradas()));
        } else {
            chamado.setPrazoResolucao(null);
        }

        registrarHistorico(chamado, usuario, anterior != null ? anterior.name() : null, nova.name());
        chamadoRepository.save(chamado);
        String alteracaoPrioridade = "Alteração: " + (anterior != null ? anterior.descricaoFormatada() : "Não definida") + " -> " + nova.descricaoFormatada();
        String prazoPrio = chamado.getPrazoResolucao() != null ? "Novo prazo estimado: " + chamado.getPrazoResolucao().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : null;
        notificacoes.emitir(chamado.getSolicitante(), usuarioId, chamado, "PRIORIDADE", "Prioridade atualizada", alteracaoPrioridade, usuario.getNome(), prazoPrio);
        if (chamado.getResponsavel() != null) {
            notificacoes.emitir(chamado.getResponsavel(), usuarioId, chamado, "PRIORIDADE", "Prioridade atualizada", alteracaoPrioridade, usuario.getNome(), prazoPrio);
        }
        return toResponse(chamado);
    }

    @Transactional
    public ChamadoResponse avaliarChamado(Long id, AvaliacaoChamadoRequest dto, Long usuarioId) {
        return avaliarChamado(id, dto, buscarUsuario(usuarioId));
    }

    @Transactional
    public ChamadoResponse alterarCategoria(Long chamadoId, Long usuarioId,
            com.cobyte.api.dto.request.AlterarCategoriaRequest request) {
        var chamado = chamadoRepository.findParaAvaliacao(chamadoId)
                .orElseThrow(() -> new ResourceNotFoundException("Chamado não encontrado"));
        var usuario = buscarUsuarioDoSuporte(usuarioId);
        if (!chamado.possuiTecnico(usuarioId) && usuario.getPerfil() != PerfilUsuario.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente técnicos do chamado podem alterar a categoria");
        }
        if (chamado.getStatus() != StatusChamado.EM_ANALISE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Categoria só pode ser alterada em Em Análise");
        }
        var anterior = chamado.getCategoria();
        boolean outra = "OUTRA".equals(request.novaCategoria());
        String personalizada = outra && request.categoriaPersonalizada() != null
                ? request.categoriaPersonalizada().strip() : null;
        if (outra && (personalizada == null || personalizada.length() < 3 || personalizada.length() > 100)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe uma categoria entre 3 e 100 caracteres");
        }
        CategoriaChamado nova = null;
        if (!outra) {
            try { nova = CategoriaChamado.valueOf(request.novaCategoria()); }
            catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Categoria inválida");
            }
        }
        if (anterior == nova && java.util.Objects.equals(chamado.getCategoriaPersonalizada(), personalizada)) return toResponse(chamado);
        String valorAnterior = chamado.getCategoriaPersonalizada() != null ? chamado.getCategoriaPersonalizada()
                : anterior == null ? null : anterior.name();
        chamado.setCategoria(nova);
        chamado.setCategoriaPersonalizada(personalizada);
        final var categoriaFinal = nova;
        classificacaoIaRepository.findByChamadoId(chamadoId).ifPresent(ia -> ia.setCategoriaFinal(categoriaFinal));
        registrarHistorico(chamado, usuario, valorAnterior, "CATEGORIA:" + (outra ? personalizada : nova.name()));
        chamadoRepository.save(chamado);
        return toResponse(chamado);
    }

    /** O bloqueio serializa avaliações concorrentes para impedir sobrescrita da primeira nota. */
    @Transactional
    public ChamadoResponse avaliarChamado(Long id, AvaliacaoChamadoRequest dto, Usuario usuarioAutenticado) {
        Chamado chamado = chamadoRepository.findParaAvaliacao(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chamado não encontrado"));
        acesso.exigirSolicitante(chamado, usuarioAutenticado);
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
                .protocolo(gerarProtocolo())
                .titulo(req.titulo())
                .descricao(req.descricao())
                .origem(req.origem()!=null ? req.origem() : com.cobyte.api.model.enums.OrigemChamado.TEXTO)
                .duracaoAudioSegundos(req.duracaoAudioSegundos())
                .empresa(solicitante.getEmpresa())
                .solicitante(solicitante)
                .build());

        registrarHistorico(chamado, solicitante, null, chamado.getStatus().name());
        notificacoes.emitir(solicitante, null, chamado, "ABERTURA", "Chamado registrado", chamado.getDescricao(), solicitante.getNome(), null);
        return chamado.getId();
    }

    private static String gerarProtocolo() {
        var protocolo = new StringBuilder("LAB");
        for (int grupo = 0; grupo < 3; grupo++) {
            protocolo.append('-');
            for (int i = 0; i < 4; i++) {
                protocolo.append(ALFABETO_PROTOCOLO.charAt(ALEATORIO.nextInt(ALFABETO_PROTOCOLO.length())));
            }
        }
        return protocolo.toString();
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

        if (chamado.getStatus() == StatusChamado.ABERTO && ia.isPresent() && ia.get().foraDoEscopo()
                && ia.get().motivoCancelamento() != null && ia.get().motivoCancelamento().trim().length() >= 10) {
            var resultado = ia.get();
            String motivo = "Cancelado pela IA: " + resultado.motivoCancelamento().trim();
            chamado.setStatus(StatusChamado.CANCELADO);
            chamado.setPrioridade(null);
            chamado.setCategoria(null);
            chamado.setMotivoCancelamento(motivo);
            chamado.setCanceladoEm(LocalDateTime.now());
            chamado.setCanceladoPor(null);
            chamado.setPrazoPrimeiraResposta(null);
            chamado.setPrazoResolucao(null);
            classificacaoIaRepository.save(ClassificacaoIa.builder().chamado(chamado)
                    .justificativa(resultado.justificativa()).modelo(modeloIa).build());
            historicoRepository.save(HistoricoChamado.builder().chamado(chamado).usuario(null)
                    .valorAnterior(StatusChamado.ABERTO.codigo()).valorNovo(StatusChamado.CANCELADO.codigo())
                    .observacao(motivo).build());
            notificacoes.emitir(chamado.getSolicitante(), null, chamado, "STATUS",
                    "Chamado cancelado pela triagem", motivo);
            return toResponse(chamado);
        }

        // Ausência de evidências permanece pendente, sem classificação ou SLA inventados.
        Prioridade prioridade = ia.map(ClassificacaoIaResultadoReponse::prioridade).filter(java.util.Objects::nonNull).orElse(null);
        CategoriaChamado categoria = ia.map(ClassificacaoIaResultadoReponse::categoria).filter(java.util.Objects::nonNull).orElse(null);

        chamado.setPrioridade(prioridade);
        chamado.setCategoria(categoria);

        chamado.setPrazoPrimeiraResposta(null);
        chamado.setPrazoResolucao(null);
        if (prioridade != null && prioridade.minutosResolucao() != null) {
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
                .slaMetaMinutos(prioridade == null ? null : prioridade.minutosResolucao())
                .build()));

        try {
            registrarHistorico(chamado, null, null, prioridade == null ? "Prioridade aguardando análise" : prioridade.name());
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
                        String detalheAuto = "Você foi selecionado para este atendimento. Confira o relato e inicie a análise quando estiver pronto.";
                        String prazoAuto = chamado.getPrazoResolucao() != null ? "Prazo estimado de resolução: " + chamado.getPrazoResolucao().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : null;
                        notificacoes.emitir(suporte, null, chamado, "ATRIBUICAO", "Novo chamado para você", detalheAuto, "Sistema Cobyte", prazoAuto);
                    } catch (Exception e) {
                        log.error("Falha ao emitir notificação de atribuição automática: {}", e.getMessage());
                    }
                });
    }

    private void mudarStatus(Chamado chamado, Usuario usuario, StatusChamado novo) {
        mudarStatus(chamado, usuario, novo, null);
    }

    private void mudarStatus(Chamado chamado, Usuario usuario, StatusChamado novo, String observacao) {
        FluxoChamado.validarClassificacao(chamado, novo);
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
        String alteracao = "Alteração: " + anterior.descricaoFormatada() + " -> " + novo.descricaoFormatada();
        String prazo = chamado.getPrazoResolucao() != null ? "Prazo estimado de resolução: " + chamado.getPrazoResolucao().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : null;
        String autorNome = usuario != null ? usuario.getNome() : "Sistema Cobyte";
        Long autorId = usuario != null ? usuario.getId() : null;

        notificacoes.emitir(chamado.getSolicitante(), autorId, chamado, "STATUS", "Status atualizado", alteracao, autorNome, prazo);
        if (chamado.getResponsavel() != null)
            notificacoes.emitir(chamado.getResponsavel(), autorId, chamado, "STATUS", "Status atualizado", alteracao, autorNome, prazo);
        else
            notificacoes.emitirParaSuportes(autorId, chamado, "STATUS", "Status atualizado", alteracao, autorNome, prazo);
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
