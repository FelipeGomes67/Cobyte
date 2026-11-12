package com.labware.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    private final JavaMailSender mailSender;

    @Value("${labware.email.remetente}")
    private String remetente;

    @Value("${labware.email.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public record EmailNotificacao(
            String destinatario,
            String nome,
            String assunto,
            String tipo,
            Long chamadoId,
            String protocolo,
            String titulo,
            String empresa,
            String status,
            String prioridade,
            String autor,
            String detalhe,
            String observacao
    ) {
        public EmailNotificacao(String destinatario, String assunto, String detalhe) {
            this(destinatario, null, assunto, "MENSAGEM", null, null, null, null, null, null, null, detalhe, null);
        }

        public EmailNotificacao(String destinatario, String assunto, String detalhe,
                               String nome, Long chamadoId, String protocolo, String titulo, String status, String tipo) {
            this(destinatario, nome, assunto, tipo, chamadoId, protocolo, titulo, null, status, null, null, detalhe, null);
        }
    }

    private static String escapar(String valor) {
        return HtmlUtils.htmlEscape(valor == null ? "" : valor);
    }

    private static String valorOu(String valor, String fallback) {
        return (valor != null && !valor.isBlank()) ? valor.trim() : fallback;
    }

    private static String nomeValido(String nome) {
        return (nome != null && !nome.isBlank()) ? nome.trim() : "usuário";
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void enviar(EmailNotificacao evento) {
        if (evento.destinatario() == null || evento.destinatario().isBlank()) {
            return;
        }

        try {
            String assuntoFormatado;
            if (evento.protocolo() != null && !evento.protocolo().isBlank()) {
                assuntoFormatado = String.format("[%s] %s", evento.protocolo().trim(), valorOu(evento.assunto(), "Notificação"));
            } else {
                assuntoFormatado = String.format("[LabWare] %s", valorOu(evento.assunto(), "Notificação"));
            }

            String corpoTexto = construirCorpoTexto(evento);

            var mensagem = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(mensagem, true, StandardCharsets.UTF_8.name());
            helper.setFrom(remetente);
            helper.setTo(evento.destinatario());
            helper.setSubject(assuntoFormatado);

            String htmlCorpo = "<!doctype html><html lang='pt-BR'><body style='margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;line-height:1.6'>"
                    + "<div style='max-width:620px;margin:0 auto;background:#ffffff;padding:28px;border:1px solid #e2e8f0;border-radius:8px'>"
                    + "<div style='border-bottom:2px solid #1d4ed8;padding-bottom:12px;margin-bottom:20px'>"
                    + "<span style='font-weight:bold;color:#1d4ed8;font-size:16px'>LABWARE · Central de Suporte</span>"
                    + "</div>"
                    + "<pre style='font-family:Arial,Helvetica,sans-serif;font-size:14px;white-space:pre-wrap;margin:0;color:#1e293b;line-height:1.6'>"
                    + escapar(corpoTexto)
                    + "</pre>"
                    + "</div>"
                    + "</body></html>";

            helper.setText(corpoTexto, htmlCorpo);
            mailSender.send(mensagem);
            log.info("E-mail de notificação enviado com sucesso para: {}", evento.destinatario());
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail de notificação: {}", e.getMessage());
        }
    }

    private String construirCorpoTexto(EmailNotificacao evento) {
        StringBuilder sb = new StringBuilder();
        sb.append("Olá, ").append(nomeValido(evento.nome())).append(",\n\n");

        if ("APROVACAO_CADASTRO".equalsIgnoreCase(evento.tipo())) {
            sb.append("Seu cadastro na plataforma LabWare foi aprovado com sucesso!\n\n");
            if (evento.empresa() != null && !evento.empresa().isBlank()) {
                sb.append("Empresa vinculada: ").append(evento.empresa().trim()).append("\n");
            }
            sb.append("Status: Ativo\n\n");
            sb.append("Seu acesso à central de atendimento está liberado. Agora você já pode abrir e acompanhar seus chamados.\n\n");
            sb.append("Acesse o sistema LabWare para começar:\n");
            sb.append(frontendUrl.replaceAll("/+$", "")).append("/login\n");
            return sb.toString();
        }

        if (evento.chamadoId() != null || (evento.protocolo() != null && !evento.protocolo().isBlank())) {
            String frase = switch (evento.tipo() == null ? "" : evento.tipo()) {
                case "ABERTURA" -> "Seu chamado foi registrado com sucesso em nossa central de atendimento:";
                case "MENSAGEM" -> "Uma nova mensagem foi enviada no chamado abaixo:";
                case "STATUS" -> "O status do chamado foi atualizado:";
                case "PRIORIDADE" -> "A prioridade do chamado foi atualizada:";
                case "ATRIBUICAO" -> "O chamado abaixo foi atribuído para atendimento:";
                default -> "Há uma nova atualização no chamado abaixo:";
            };
            sb.append(frase).append("\n\n");

            sb.append("Protocolo: ").append(valorOu(evento.protocolo(), "Não informado")).append("\n");
            sb.append("Título: ").append(valorOu(evento.titulo(), "Sem título")).append("\n");
            sb.append("Empresa: ").append(valorOu(evento.empresa(), "Não informada")).append("\n");
            sb.append("Status: ").append(valorOu(evento.status(), "Aberto")).append("\n");
            sb.append("Prioridade: ").append(valorOu(evento.prioridade(), "Média")).append("\n\n");

            switch (evento.tipo() == null ? "" : evento.tipo()) {
                case "MENSAGEM" -> {
                    if (evento.autor() != null && !evento.autor().isBlank()) {
                        sb.append("Autor: ").append(evento.autor().trim()).append("\n");
                    }
                    sb.append("Mensagem:\n");
                    sb.append(valorOu(evento.detalhe(), "(Sem conteúdo)")).append("\n\n");
                }
                case "STATUS", "PRIORIDADE" -> {
                    sb.append(valorOu(evento.detalhe(), "Status alterado")).append("\n");
                    if (evento.observacao() != null && !evento.observacao().isBlank()) {
                        sb.append(evento.observacao().trim()).append("\n");
                    }
                    sb.append("\n");
                }
                case "ABERTURA" -> {
                    sb.append("Descrição do problema relatado:\n");
                    sb.append(valorOu(evento.detalhe(), "(Sem descrição informada)")).append("\n\n");
                }
                case "ATRIBUICAO" -> {
                    if (evento.autor() != null && !evento.autor().isBlank()) {
                        sb.append("Atribuído por: ").append(evento.autor().trim()).append("\n");
                    }
                    if (evento.detalhe() != null && !evento.detalhe().isBlank()) {
                        sb.append("Detalhes: ").append(evento.detalhe().trim()).append("\n");
                    }
                    if (evento.observacao() != null && !evento.observacao().isBlank()) {
                        sb.append(evento.observacao().trim()).append("\n");
                    }
                    sb.append("\n");
                }
                default -> {
                    if (evento.detalhe() != null && !evento.detalhe().isBlank()) {
                        sb.append(evento.detalhe().trim()).append("\n\n");
                    }
                }
            }

            sb.append("Acesse o sistema LabWare para acompanhar ou responder:\n");
            sb.append(frontendUrl.replaceAll("/+$", "")).append("/chamados/").append(evento.chamadoId()).append("\n");
            return sb.toString();
        }

        // Caso geral
        if (evento.detalhe() != null && !evento.detalhe().isBlank()) {
            sb.append(evento.detalhe().trim()).append("\n\n");
        }
        sb.append("Acesse o sistema LabWare para acompanhar ou responder.\n");
        return sb.toString();
    }
}
