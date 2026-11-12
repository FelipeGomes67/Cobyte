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

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    private final JavaMailSender mailSender;
    @Value("${labware.email.remetente}")
    private String remetente;
    @Value("${labware.email.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public record EmailNotificacao(String destinatario, String titulo, String texto,
            String nome, Long chamadoId, String protocolo, String assunto, String status, String tipo) {
        public EmailNotificacao(String destinatario, String titulo, String texto) {
            this(destinatario, titulo, texto, null, null, null, null, null, null);
        }
    }

    private static String escapar(String valor) {
        return HtmlUtils.htmlEscape(valor == null ? "" : valor);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void enviar(EmailNotificacao evento) {
        try {
            String orientacao = switch (evento.tipo() == null ? "" : evento.tipo()) {
                case "ABERTURA" -> "Seu chamado foi registrado. Nossa equipe irá analisar sua solicitação. Acompanhe o atendimento pelo link abaixo.";
                case "MENSAGEM" -> "Há uma nova mensagem na conversa do chamado. Acesse o atendimento para ler a resposta e enviar as informações necessárias.";
                case "STATUS" -> "O atendimento avançou para uma nova etapa. Confira o status atualizado e os próximos passos na página do chamado.";
                case "ATRIBUICAO" -> "Um chamado foi atribuído a você. Consulte o relato, a prioridade e o prazo antes de iniciar o atendimento.";
                default -> "Há uma atualização no seu atendimento. Acesse o sistema para consultar os detalhes.";
            };
            String link = frontendUrl.replaceAll("/+$", "") + "/chamados/" + evento.chamadoId();
            String contexto = evento.chamadoId() == null ? "" :
                    "<div style='padding:18px;background:#f1f5f9;border-radius:8px'>"
                    + "<p><strong>Protocolo:</strong> " + escapar(evento.protocolo()) + "</p>"
                    + "<p><strong>Chamado:</strong> " + escapar(evento.assunto()) + "</p>"
                    + "<p><strong>Status:</strong> " + escapar(evento.status()) + "</p></div>"
                    + "<p style='margin:28px 0'><a style='background:#1d4ed8;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px' href='" + escapar(link) + "'>Acompanhar chamado</a></p>"
                    + "<p>Se o botão não abrir, acesse: <a href='" + escapar(link) + "'>" + escapar(link) + "</a></p>";
            String html = "<!doctype html><html lang='pt-BR'><body style='margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b'>"
                    + "<main style='max-width:620px;margin:24px auto;padding:28px;background:white'>"
                    + "<p style='color:#1d4ed8;font-weight:bold'>LABWARE · Central de suporte</p>"
                    + "<h1 style='font-size:24px'>" + escapar(evento.titulo()) + "</h1>"
                    + "<p>Olá" + (evento.nome() == null ? "" : ", " + escapar(evento.nome())) + "!</p>"
                    + "<p style='line-height:1.6'>" + orientacao + "</p>"
                    + "<p>" + escapar(evento.texto()) + "</p>" + contexto
                    + "<hr><p style='font-size:13px;color:#475569'>Mensagem automática. Responda pelo chat do chamado. Você pode ajustar os tipos de aviso em Configurações → Notificações.</p>"
                    + "</main></body></html>";
            String simples = evento.titulo() + "\n\n" + orientacao + "\n" + evento.texto()
                    + (evento.chamadoId() == null ? "" : "\nProtocolo: " + evento.protocolo() + "\nChamado: " + evento.assunto() + "\nStatus: " + evento.status() + "\nAcesse: " + link);
            var mensagem = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(mensagem, true, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(evento.destinatario());
            helper.setSubject(evento.titulo() + (evento.protocolo() == null ? "" : " · " + evento.protocolo()));
            helper.setText(simples, html);
            mailSender.send(mensagem);
            log.info("E-mail de notificação enviado com sucesso");
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail de notificação: {}", e.getMessage());
        }
    }
}
