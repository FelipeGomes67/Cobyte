import { useState, useRef, useEffect } from 'react';
import '../../css/FormularioNovoChamado.css';

export default function FormularioNovoChamado({ modoInicial = 'texto' }) {
  const [modo, setModo] = useState(modoInicial);
  const [textos, setTextos] = useState({ trans: '', desc: '' });
  const [arquivos, setArquivos] = useState([]);
  const [gravando, setGravando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    let t;
    if (gravando && !pausado) t = setInterval(() => setTempo((prev) => prev + 1), 1000);
    return () => clearInterval(t);
  }, [gravando, pausado]);

  const iniciarOuRetomar = async () => {
    if (tocando && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setTocando(false);
    }

    if (!gravando) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.start();
        setGravando(true);
        setPausado(false);
      } catch {
        alert('Não foi possível acessar o microfone.');
      }
    } else if (pausado) {
      mediaRecorderRef.current?.resume();
      setPausado(false);
    }
  };

  const pausarGravacao = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPausado(true);
    }
  };

  const toggleGravacao = () => {
    if (!gravando || pausado) iniciarOuRetomar();
    else pausarGravacao();
  };

  const ouvirGravacao = () => {
    if (gravando && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPausado(true);
    }

    if (tocando) {
      audioPlayerRef.current?.pause();
      setTocando(false);
      return;
    }

    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);

      audioPlayerRef.current = new Audio(url);
      audioPlayerRef.current.play();
      setTocando(true);
      audioPlayerRef.current.onended = () => setTocando(false);
    }
  };

  const excluirERegravar = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setTocando(false);
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    }
    setGravando(false);
    setPausado(false);
    setTempo(0);
    audioChunksRef.current = [];
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const novosArquivos = selectedFiles.map((f) => ({
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`
    }));
    setArquivos((prev) => [...prev, ...novosArquivos]);
  };

  const submit = (e) => {
    e.preventDefault();
    alert('O envio de chamados ainda não está conectado neste formulário.');
  };

  const fmtTempo = `${String(Math.floor(tempo / 60)).padStart(2, '0')}:${String(tempo % 60).padStart(2, '0')}`;

  return (
    <div className="novo-chamado-container">
      <header className="novo-chamado-header">
        <span className="subtitulo-app">Suporte Labware</span>
        <h1>Novo Chamado</h1>
        <p className="descricao-pagina">
          Descreva o seu problema por Áudio ou Texto. A nossa Inteligência Artificial cuidará do resto.
        </p>
      </header>

      <form onSubmit={submit} className="card-chamado-wrapper">
        <div className="toggle-modo-grupo">
          <button
            type="button"
            className={`btn-toggle-modo ${modo === 'voz' ? 'ativo' : ''}`}
            onClick={() => setModo('voz')}
          >
            <img src="/icons/mic.svg" alt="" /> Relatar por Voz
          </button>
          <button
            type="button"
            className={`btn-toggle-modo ${modo === 'texto' ? 'ativo' : ''}`}
            onClick={() => setModo('texto')}
          >
            <img src="/icons/digitar_icone.svg" alt="" /> Digitar Texto
          </button>
        </div>

        {modo === 'voz' ? (
          <section>
            <h3>Conte o que aconteceu</h3>
            <div className="area-gravacao-audio">
              <button
                type="button"
                className={`btn-gravador-circulo ${gravando && !pausado ? 'gravando' : ''}`}
                onClick={toggleGravacao}
              >
                <img src="/icons/mic.svg" alt="Mic" />
              </button>

              <p className="instrucao-audio">
                {!gravando
                  ? 'Clique no microfone para começar a gravar.'
                  : pausado
                  ? 'Gravação pausada.'
                  : 'Fale naturalmente. Estamos aqui para ajudar.'}
              </p>

              <div className="waveform-container">
                {Array.from({ length: 32 }).map((_, i) => (
                  <span
                    key={i}
                    className={`onda-barra ${gravando && !pausado ? 'animando' : ''}`}
                    style={{ animationDelay: `${(i % 5) * 0.15}s` }}
                  />
                ))}
              </div>

              <span className="cronometro-audio">{fmtTempo}</span>

              <div className="controles-audio-botoes">
                <button
                  type="button"
                  className="btn-audio-acao"
                  onClick={iniciarOuRetomar}
                  disabled={!gravando || !pausado}
                >
                  ⏸ Retomar
                </button>

                <button
                  type="button"
                  className="btn-audio-acao"
                  onClick={ouvirGravacao}
                  disabled={!gravando && tempo === 0}
                >
                  {tocando ? '⏸ Pausar Áudio' : '▷ Ouvir Gravação'}
                </button>

                <button
                  type="button"
                  className="btn-audio-acao"
                  onClick={excluirERegravar}
                  disabled={!gravando && tempo === 0}
                >
                  ↻ Excluir e Regravar
                </button>

                <button
                  type="button"
                  className="btn-audio-enviar"
                  disabled={!gravando && tempo === 0}
                  onClick={() => alert('A transcrição ainda não está conectada neste formulário.')}
                >
                  <img src="/icons/enviar.svg" alt="" className="icone-enviar-branco" /> Enviar
                </button>
              </div>
            </div>

            <div className="caixa-transcricao-wrapper">
              <textarea
                className="campo-transcricao"
                placeholder="Texto transcrito..."
                value={textos.trans}
                onChange={(e) => setTextos({ ...textos, trans: e.target.value })}
              />
              <label className="aviso-transcricao" style={{ cursor: 'pointer' }}>
                Ou anexe um arquivo de áudio ⌵
                <input type="file" accept="audio/*" onChange={handleFileSelect} hidden />
              </label>
            </div>
          </section>
        ) : (
          <section>
            <h3>Descreva o que aconteceu</h3>
            <p className="subtexto-instrucao">Inclua o erro apresentado e como afeta o seu trabalho.</p>
            <textarea
              className="campo-textarea-descricao"
              placeholder="Descreva o problema detalhadamente ou cole a mensagem de erro aqui..."
              value={textos.desc}
              onChange={(e) => setTextos({ ...textos, desc: e.target.value })}
            />
          </section>
        )}

        <section>
          <h3 className="titulo-anexos">Anexos e evidências</h3>
          <p className="subtexto-instrucao">Uma imagem ou documento ajuda a entender o problema.</p>

          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div className="dropzone-box">
            <p className="dropzone-texto">Arraste e solte os seus arquivos aqui</p>
            <div className="botoes-upload-grupo">
              <button
                type="button"
                className="btn-upload-opcao"
                onClick={() => cameraInputRef.current?.click()}
              >
                <img src="/icons/Camera.svg" alt="Câmera" /> Tirar Foto
              </button>
              <button
                type="button"
                className="btn-upload-opcao"
                onClick={() => fileInputRef.current?.click()}
              >
                <img src="/icons/icone_clips.svg" alt="Anexo" /> Procurar Arquivo
              </button>
            </div>
            <span className="dica-formatos">
              PNG, JPG ou PDF - câmera do dispositivo disponível na aplicação
            </span>
          </div>

          {arquivos.length > 0 && (
            <div className="lista-anexos-carregados">
              {arquivos.map((f, i) => (
                <div key={i} className="card-anexo-item">
                  <div className="icone-anexo-box">
                    <img src="/icons/file.svg" alt="Arquivo" />
                  </div>
                  <div className="info-anexo">
                    <strong>{f.name}</strong> <small>{f.size}</small>
                  </div>
                  <button
                    type="button"
                    className="btn-remover-anexo"
                    onClick={() => setArquivos(arquivos.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="rodape-formulario">
          <button type="submit" className="btn-enviar-chamado-principal">
            <img src="/icons/enviar.svg" alt="" className="icone-enviar-branco" />
            <span>Enviar Chamado</span>
          </button>
        </div>
      </form>
    </div>
  );
}
