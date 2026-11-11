import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transcreverAudio } from '../../services/sttService';
import { criarChamadoApi } from '../../services/ticketService';
import '../../css/FormularioNovoChamado.css';

export default function FormularioNovoChamado({ modoInicial = 'texto' }) {
  const navigate = useNavigate();
  const [modo, setModo] = useState(modoInicial);
  const [textos, setTextos] = useState({ trans: '', desc: '' });
  const [arquivos, setArquivos] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroAudio, setErroAudio] = useState('');
  const [erroGeral, setErroGeral] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const audioFileInputRef = useRef(null);

  useEffect(() => {
    let t;
    if (gravando && !pausado) {
      t = setInterval(() => setTempo((prev) => prev + 1), 1000);
    }
    return () => clearInterval(t);
  }, [gravando, pausado]);

  // Limpa streams de microfone ao desmontar o componente
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const iniciarOuRetomar = async () => {
    setErroAudio('');
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
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.start(250);
        setGravando(true);
        setPausado(false);
        setAudioBlob(null);
      } catch (err) {
        console.error('Erro ao acessar microfone:', err);
        setErroAudio('Permissão de microfone negada ou dispositivo não encontrado.');
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
    if (!gravando || pausado) {
      iniciarOuRetomar();
    } else {
      pausarGravacao();
    }
  };

  const obterBlobFinal = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          resolve(blob);
        } else {
          resolve(audioBlob);
        }
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      setGravando(false);
      setPausado(false);
    });
  };

  const ouvirGravacao = async () => {
    if (gravando && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPausado(true);
    }

    if (tocando) {
      audioPlayerRef.current?.pause();
      setTocando(false);
      return;
    }

    let blobParaTocar = audioBlob;
    if (!blobParaTocar && audioChunksRef.current.length > 0) {
      blobParaTocar = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blobParaTocar);
    }

    if (blobParaTocar) {
      const url = URL.createObjectURL(blobParaTocar);
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
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    }
    setGravando(false);
    setPausado(false);
    setTempo(0);
    setAudioBlob(null);
    audioChunksRef.current = [];
    setErroAudio('');
  };

  const enviarAudioParaTranscricao = async () => {
    setErroAudio('');
    setTranscrevendo(true);

    try {
      const blob = await obterBlobFinal();
      if (!blob || blob.size === 0) {
        throw new Error('Nenhum áudio foi gravado ainda.');
      }

      const resultado = await transcreverAudio(blob);
      if (resultado?.transcricao) {
        setTextos((prev) => ({
          ...prev,
          trans: resultado.transcricao,
        }));
      } else {
        throw new Error('Não foi possível obter o texto transcrito da API.');
      }
    } catch (err) {
      console.error('Erro na transcrição:', err);
      setErroAudio(err.message || 'Falha ao processar o áudio.');
    } finally {
      setTranscrevendo(false);
    }
  };

  const handleAudioFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErroAudio('');
    setTranscrevendo(true);
    setAudioBlob(file);

    try {
      const resultado = await transcreverAudio(file);
      if (resultado?.transcricao) {
        setTextos((prev) => ({
          ...prev,
          trans: resultado.transcricao,
        }));
      }
    } catch (err) {
      console.error('Erro ao transcrever arquivo de áudio:', err);
      setErroAudio(err.message || 'Falha ao processar arquivo de áudio.');
    } finally {
      setTranscrevendo(false);
      e.target.value = '';
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setArquivos((prev) => [...prev, ...selectedFiles]);
    setErroGeral('');
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErroGeral('');

    const texto = modo === 'voz' ? textos.trans.trim() : textos.desc.trim();
    if (!texto) {
      setErroGeral('Por favor, descreva o problema antes de enviar o chamado.');
      return;
    }

    // Regra estrita de anexo obrigatório
    if (!arquivos || arquivos.length === 0) {
      setErroGeral('É obrigatório anexar um arquivo para abrir o chamado.');
      return;
    }

    setEnviando(true);

    try {
      let audioFinal = null;
      if (modo === 'voz') {
        audioFinal = audioBlob || (audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null);
      }

      await criarChamadoApi({
        descricao: texto,
        origem: modo === 'voz' ? 'VOZ' : 'TEXTO',
        duracaoAudioSegundos: modo === 'voz' && tempo > 0 ? tempo : null,
        arquivos,
        audio: audioFinal,
      });

      // Redireciona com sucesso para a lista de chamados
      navigate('/chamados');
    } catch (err) {
      console.error('Erro ao criar chamado:', err);
      setErroGeral(err.message || 'Não foi possível registrar o chamado. Tente novamente.');
    } finally {
      setEnviando(false);
    }
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
                title={!gravando ? 'Iniciar gravação' : pausado ? 'Retomar gravação' : 'Pausar gravação'}
              >
                <img src="/icons/mic.svg" alt="Mic" />
              </button>

              <p className="instrucao-audio">
                {transcrevendo
                  ? 'Transcrevendo áudio com inteligência artificial…'
                  : !gravando
                  ? 'Clique no microfone para começar a gravar.'
                  : pausado
                  ? 'Gravação pausada.'
                  : 'Fale naturalmente. Estamos aqui para ajudar.'}
              </p>

              {erroAudio && (
                <p className="subtexto-instrucao" style={{ color: '#dc2626', fontWeight: 500, margin: '4px 0 12px', textAlign: 'center' }}>
                  {erroAudio}
                </p>
              )}

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
                  disabled={!gravando || !pausado || transcrevendo}
                >
                  ⏸ Retomar
                </button>

                <button
                  type="button"
                  className="btn-audio-acao"
                  onClick={ouvirGravacao}
                  disabled={(!gravando && tempo === 0 && !audioBlob) || transcrevendo}
                >
                  {tocando ? '⏸ Pausar Áudio' : '▷ Ouvir Gravação'}
                </button>

                <button
                  type="button"
                  className="btn-audio-acao"
                  onClick={excluirERegravar}
                  disabled={(!gravando && tempo === 0 && !audioBlob) || transcrevendo}
                >
                  ↻ Excluir e Regravar
                </button>

                <button
                  type="button"
                  className="btn-audio-enviar"
                  disabled={(!gravando && tempo === 0 && !audioBlob) || transcrevendo}
                  onClick={enviarAudioParaTranscricao}
                >
                  <img src="/icons/enviar.svg" alt="" className="icone-enviar-branco" />
                  <span>{transcrevendo ? 'Transcrevendo…' : 'Enviar'}</span>
                </button>
              </div>
            </div>

            <div className="caixa-transcricao-wrapper">
              <textarea
                className="campo-transcricao"
                placeholder="Texto transcrito..."
                value={textos.trans}
                onChange={(e) => {
                  setTextos({ ...textos, trans: e.target.value });
                  setErroGeral('');
                }}
                disabled={transcrevendo || enviando}
              />
              <label className="aviso-transcricao" style={{ cursor: 'pointer' }}>
                Ou anexe um arquivo de áudio ⌵
                <input
                  type="file"
                  ref={audioFileInputRef}
                  accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac"
                  onChange={handleAudioFileUpload}
                  hidden
                />
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
              onChange={(e) => {
                setTextos({ ...textos, desc: e.target.value });
                setErroGeral('');
              }}
              disabled={enviando}
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
                disabled={enviando}
              >
                <img src="/icons/Camera.svg" alt="Câmera" /> Tirar Foto
              </button>
              <button
                type="button"
                className="btn-upload-opcao"
                onClick={() => fileInputRef.current?.click()}
                disabled={enviando}
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
                    <strong>{f.name}</strong> <small>{formatFileSize(f.size)}</small>
                  </div>
                  <button
                    type="button"
                    className="btn-remover-anexo"
                    onClick={() => setArquivos(arquivos.filter((_, idx) => idx !== i))}
                    disabled={enviando}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {erroGeral && (
          <p className="subtexto-instrucao" style={{ color: '#dc2626', fontWeight: 600, margin: '0' }} role="alert">
            {erroGeral}
          </p>
        )}

        <div className="rodape-formulario">
          <button
            type="submit"
            className="btn-enviar-chamado-principal"
            disabled={enviando || transcrevendo}
          >
            <img src="/icons/enviar.svg" alt="" className="icone-enviar-branco" />
            <span>{enviando ? 'Enviando chamado…' : 'Enviar Chamado'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
