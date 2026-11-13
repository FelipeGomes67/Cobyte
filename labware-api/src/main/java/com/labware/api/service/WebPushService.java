package com.labware.api.service;
import com.labware.api.model.entity.InscricaoPush;
import com.labware.api.repository.InscricaoPushRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.net.URI;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import nl.martijndwars.webpush.*;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
@Service @RequiredArgsConstructor @Slf4j
public class WebPushService {
 private final InscricaoPushRepository inscricoes;
 @Value("${WEB_PUSH_PUBLIC_KEY:}") private String publica;
 @Value("${WEB_PUSH_PRIVATE_KEY:}") private String privada;
 @Value("${WEB_PUSH_SUBJECT:}") private String assunto;
 public record Evento(Long usuarioId, Long chamadoId) {}
 public boolean habilitado() { return !publica.isBlank() && !privada.isBlank() && !assunto.isBlank(); }
 public String chavePublica() { return habilitado() ? publica : ""; }
 private String id(String endpoint) {
  try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(endpoint.getBytes(StandardCharsets.UTF_8))); }
  catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
 }
 public void registrar(Long usuario, String endpoint, String chave, String auth) {
  if (!habilitado()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Web Push ainda não configurado");
  try {
   URI uri=URI.create(endpoint); String host=uri.getHost();
   boolean permitido=host!=null && (host.equals("fcm.googleapis.com") || host.equals("updates.push.services.mozilla.com") || host.endsWith(".push.services.mozilla.com") || host.equals("web.push.apple.com") || host.endsWith(".notify.windows.com"));
   if (!"https".equals(uri.getScheme()) || !permitido || uri.getUserInfo()!=null || (uri.getPort()!=-1 && uri.getPort()!=443)) throw new IllegalArgumentException();
   if (Base64.getUrlDecoder().decode(chave).length!=65 || Base64.getUrlDecoder().decode(auth).length!=16) throw new IllegalArgumentException();
  } catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Inscrição push inválida"); }
  var existente=inscricoes.findById(id(endpoint));
  if(existente.isPresent() && !existente.get().getUsuarioId().equals(usuario))
   throw new ResponseStatusException(HttpStatus.CONFLICT,"Desative a inscrição anterior neste navegador antes de ativar outra conta");
  if(existente.isEmpty() && inscricoes.findByUsuarioId(usuario).size()>=10)
   throw new ResponseStatusException(HttpStatus.CONFLICT,"Limite de 10 dispositivos atingido");
  var registro=existente.orElseGet(InscricaoPush::new);
  registro.setId(id(endpoint)); registro.setUsuarioId(usuario); registro.setEndpoint(endpoint); registro.setP256dh(chave); registro.setAuth(auth);
  inscricoes.save(registro);
 }
 public void remover(Long usuario,String endpoint) {
  inscricoes.findById(id(endpoint)).filter(i->i.getUsuarioId().equals(usuario)).ifPresent(inscricoes::delete);
 }
 @Async @TransactionalEventListener
 public void enviar(Evento evento) {
  if(!habilitado()) return;
  try {
   Security.addProvider(new BouncyCastleProvider());
   var push=new PushService(publica,privada,assunto);
   var config=org.apache.http.client.config.RequestConfig.custom().setConnectTimeout(5000).setSocketTimeout(10000).setConnectionRequestTimeout(5000).build();
   try(var cliente=org.apache.http.impl.client.HttpClients.custom().disableRedirectHandling().setDefaultRequestConfig(config).build()) {
   for(var registro:inscricoes.findByUsuarioId(evento.usuarioId())) {
    try {
     // Sem dados pessoais no aviso exibido na tela bloqueada.
     String payload=new tools.jackson.databind.ObjectMapper().writeValueAsString(Map.of("title","Labware: atualização no atendimento","body","Há uma nova atualização. Acesse o chamado para conferir.","url","/chamados/"+evento.chamadoId()));
     try(var resposta=cliente.execute(push.preparePost(new Notification(registro.getEndpoint(),registro.getP256dh(),registro.getAuth(),payload), Encoding.AES128GCM))) {
     int codigo=resposta.getStatusLine().getStatusCode();
     if(codigo==404 || codigo==410) inscricoes.deleteById(registro.getId());
     else if(codigo>=400) log.warn("Web Push recusado pelo provedor: {}",codigo);
     }
    } catch(Exception e) { log.warn("Falha ao enviar Web Push: {}",e.getClass().getSimpleName()); }
   }
   }
  } catch(Exception e) { log.warn("Configuração Web Push inválida: {}",e.getClass().getSimpleName()); }
 }
}
