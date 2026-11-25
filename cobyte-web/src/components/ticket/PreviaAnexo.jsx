import { useEffect, useRef, useState } from 'react';
import { obterArquivoAnexo } from '../../services/ticketService';

export default function PreviaAnexo({ anexo, tipo = 'imagem' }) {
  const [url, definirUrl] = useState('');
  const [erro, definirErro] = useState('');
  const [texto, definirTexto] = useState(null);
  const [textoLimitado, definirTextoLimitado] = useState(false);
  const reprodutor = useRef(null);

  useEffect(() => {
    const audio = reprodutor.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    };
  }, [url]);

  useEffect(() => {
    const controlador = new AbortController();
    let urlLocal;
    obterArquivoAnexo(anexo.id, controlador.signal)
      .then(async blob => {
        if (tipo === 'texto') {
          const conteudo = await blob.slice(0, 200000).text();
          if (controlador.signal.aborted) return;
          definirTexto(conteudo);
          definirTextoLimitado(blob.size > 200000);
          return;
        }
        if (tipo === 'pdf') {
          if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('PDF inválido');
          blob = new Blob([blob], { type: 'application/pdf' });
        }
        if (controlador.signal.aborted) return;
        urlLocal = URL.createObjectURL(blob);
        definirUrl(urlLocal);
      })
      .catch(() => {
        if (!controlador.signal.aborted) definirErro('Não foi possível carregar o anexo. Tente novamente ou baixe o arquivo.');
      });
    return () => {
      controlador.abort();
      if (urlLocal) URL.revokeObjectURL(urlLocal);
    };
  }, [anexo.id, tipo]);

  return (
    <div className="previa-anexo">
      {erro ? <p role="alert">{erro}</p> : texto !== null ? (
        <>
          <pre className="previa-anexo-texto" tabIndex={0} aria-label={`Texto: ${anexo.nomeArquivo}`}>{texto || 'Arquivo de texto vazio.'}</pre>
          {textoLimitado && <p>Prévia limitada aos primeiros 200 KB. Baixe o arquivo para ler todo o conteúdo.</p>}
        </>
      ) : url ? (
        tipo === 'audio' ? (
          <audio ref={reprodutor} src={url} controls preload="metadata"
            aria-label={`Áudio: ${anexo.nomeArquivo}`}
            onError={() => definirErro('Este áudio não pôde ser reproduzido no navegador. Use a opção Baixar.')} />
        ) : tipo === 'pdf' ? (
          <>
            <object className="previa-anexo-pdf" data={url} type="application/pdf" aria-label={`PDF: ${anexo.nomeArquivo}`}>
              <p>Seu navegador não exibe PDF nesta área. Use a opção Baixar.</p>
            </object>
            <p>Se o PDF não aparecer, use a opção Baixar.</p>
          </>
        ) : (
        <img src={url} alt={`Evidência: ${anexo.nomeArquivo}`} onError={() => definirErro('Este arquivo não pôde ser exibido como imagem. Use a opção Baixar.')} />
        )
      ) : <p role="status">Carregando anexo…</p>}
    </div>
  );
}
