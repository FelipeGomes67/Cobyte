import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transcreverAudio } from '../../services/sttService';
import { criarChamadoApi } from '../../services/ticketService';
import '../../css/FormularioNovoChamado.css';

const MAX_ARQUIVO_BYTES = 10 * 1024 * 1024; // 10 MB individual
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB total (arquivos + áudio)

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
  const [arrastando, setArrastando] = useState(false);
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
    if (enviando || transcrevendo) return;
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
        setErroGeral('');
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

    if (file.size > MAX_ARQUIVO_BYTES) {
      setErroAudio('O arquivo de áudio excede o limite máximo de 10 MB.');
      e.target.value = '';
      return;
    }

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
        setErroGeral('');
      }
    } catch (err) {
      console.error('Erro ao transcrever arquivo de áudio:', err);
      setErroAudio(err.message || 'Falha ao processar arquivo de áudio.');
    } finally {
      setTranscrevendo(false);
      e.target.value = '';
    }
  };

  const validarEAdicionarArquivos = (novosArquivos) => {
    if (!novosArquivos || novosArquivos.length === 0) return;

    // 1. Validação individual: cada arquivo até 10 MB
    for (const f of novosArquivos) {
      if (f.size > MAX_ARQUIVO_BYTES) {
        setErroGeral(`O arquivo "${f.name}" ultrapassa o limite individual de 10 MB.`);
        return;
      }
    }

    // 2. Validação total: soma total de arquivos + áudio até 10 MB
    const tamanhoAudio = audioBlob?.size || 0;
    const somaArquivosExistentes = arquivos.reduce((acc, f) => acc + (f.size || 0), 0);
    const somanovo = novosArquivos.reduce((acc, f) => acc + (f.size || 0), 0);
    const somaTotal = somaArquivosExistentes + somanovo + tamanhoAudio;

    if (somaTotal > MAX_TOTAL_BYTES) {
      setErroGeral('A soma total das evidências (arquivos + áudio) excede o limite máximo de 10 MB.');
      return;
    }

    setArquivos((prev) => [...prev, ...novosArquivos]);
    setErroGeral('');
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    validarEAdicionarArquivos(selectedFiles);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (enviando || transcrevendo) return;

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    validarEAdicionarArquivos(droppedFiles);
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 KB';
    if (bytes < 1024) return '< 1 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErroGeral('');

    const texto = modo === 'voz' ? textos.trans.trim() : textos.desc.trim();
    if (!texto) {
      if (modo === 'voz') {
        setErroGeral('Por favor, grave o áudio e transcreva antes de enviar o chamado.');
      } else {
        setErroGeral('Por favor, descreva o problema antes de enviar o chamado.');
      }
      return;
    }

    // Regra estrita de ao menos 1 anexo obrigatório
    if (!arquivos || arquivos.length === 0) {
      setErroGeral('É obrigatório anexar ao menos 1 documento ou imagem antes de enviar o chamado.');
      return;
    }

    // Validação da trava de tamanho total
    let audioFinal = null;
    if (modo === 'voz') {
      audioFinal = audioBlob || (audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null);
    }

    const tamanhoTotal = arquivos.reduce((acc, f) => acc + (f.size || 0), (audioFinal?.size || 0));
    if (tamanhoTotal > MAX_TOTAL_BYTES) {
      setErroGeral('A soma total de arquivos e áudio ultrapassa o limite de 10 MB.');
      return;
    }

    setEnviando(true);

    try {
      await criarChamadoApi({
        descricao: texto,
        origem: modo === 'voz' ? 'AUDIO_VOZ' : 'PORTAL_TEXTO',
        duracaoAudioSegundos: modo === 'voz' && tempo > 0 ? tempo : null,
        arquivos,
        audio: audioFinal,
      });

      // Redireciona imediatamente para a lista de chamados após 201 Created
      navigate('/chamados');
    } catch (err) {
      console.error('Erro ao criar chamado:', err);
      setErroGeral(err.message || 'Não foi possível registrar o chamado. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const fmtTempo = `${String(Math.floor(tempo / 60)).padStart(2, '0')}:${String(tempo % 60).padStart(2, '0')}`;
  const desabilitarGeral = enviando || transcrevendo;
  const modoVozSemTranscricao = modo === 'voz' && !textos.trans.trim();

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
            disabled={desabilitarGeral}
          >
            <img src="/icons/mic.svg" alt="" /> Relatar por Voz
          </button>
          <button
            type="button"
            className={`btn-toggle-modo ${modo === 'texto' ? 'ativo' : ''}`}
            onClick={() => setModo('texto')}
            disabled={desabilitarGeral}
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
                disabled={desabilitarGeral}
                title={!gravando ? 'Iniciar gravação' : pausado ? 'Retomar gravação' : 'Pausar gravação'}
              >
                <img src="/icons/mic.svg" alt="Mic" />
              </button>

              <p className="instrucao-audio">
                {transcrevendo
                  ? 'Transcrevendo áudio com inteligência artificial...'
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
                  disabled={!gravando || !pausado || desabilitarGeral}
                >
                  ⏸ Retomar
                </button>

                <button
                  type="button"
                  className="btn-audio-acao"
                  onClick={ouvirGravacao}
                  disabled={(!gravando && tempo === 0 && !audioBlob) || desabilitarGeral}
                >
                  {tocando ? '⏸ Pausar Áudio' : '▷ Ouvir Gravação'}
                </button>

                <button
                  type="button"
                  className="btn-audio-acao"
                  onClick={excluirERegravar}
                  disabled={(!gravando && tempo === 0 && !audioBlob) || desabilitarGeral}
                >
                  ↻ Excluir e Regravar
                </button>

                <button
                  type="button"
                  className="btn-audio-enviar"
                  disabled={(!gravando && tempo === 0 && !audioBlob) || desabilitarGeral}
                  onClick={enviarAudioParaTranscricao}
                >
                  <img src="/icons/enviar.svg" alt="" className="icone-enviar-branco" />
                  <span>{transcrevendo ? 'Transcrevendo...' : 'Enviar'}</span>
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
                disabled={desabilitarGeral}
              />
              <label className="aviso-transcricao" style={{ cursor: desabilitarGeral ? 'not-allowed' : 'pointer' }}>
                Ou anexe um arquivo de áudio ⌵
                <input
                  type="file"
                  ref={audioFileInputRef}
                  accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac"
                  onChange={handleAudioFileUpload}
                  disabled={desabilitarGeral}
                  hidden
                />
              </label>
            </div>
          </section>
        ) : (
          <section>
            <h3>Descreva o que aconteceu <span style={{ color: 'red' }}>*</span></h3>
            <p className="subtexto-instrucao">Inclua o erro apresentado e como afeta o seu trabalho.</p>
            <textarea
              className="campo-textarea-descricao"
              placeholder="Descreva o problema detalhadamente ou cole a mensagem de erro aqui..."
              value={textos.desc}
              onChange={(e) => {
                setTextos({ ...textos, desc: e.target.value });
                setErroGeral('');
              }}
              disabled={desabilitarGeral}
            />
          </section>
        )}

        <section>
          <h3 className="titulo-anexos">Anexos e evidências <span style={{ color: 'red' }}>*</span></h3>
          <p className="subtexto-instrucao">Uma imagem ou documento ajuda a entender o problema. Limite de 10 MB total.</p>

          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            disabled={desabilitarGeral}
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, application/pdf"
            onChange={handleFileSelect}
            disabled={desabilitarGeral}
            style={{ display: 'none' }}
          />

          <div
            className={`dropzone-box ${arrastando ? 'arrastando' : ''} ${desabilitarGeral ? 'desabilitado' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!desabilitarGeral) setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={handleDrop}
          >
            <p className="dropzone-texto">
              {arrastando ? 'Solte os arquivos aqui...' : 'Arraste e solte os seus arquivos aqui'}
            </p>
            <div className="botoes-upload-grupo">
              <button
                type="button"
                className="btn-upload-opcao"
                onClick={() => cameraInputRef.current?.click()}
                disabled={desabilitarGeral}
              >
                <img src="/icons/Camera.svg" alt="Câmera" /> Tirar Foto
              </button>
              <button
                type="button"
                className="btn-upload-opcao"
                onClick={() => fileInputRef.current?.click()}
                disabled={desabilitarGeral}
              >
                <img src="/icons/icone_clips.svg" alt="Anexo" /> Procurar Arquivo
              </button>
            </div>
            <span className="dica-formatos">
              PNG, JPG ou PDF (máx. 10 MB cada e 10 MB no total)
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
                    disabled={desabilitarGeral}
                    title={`Remover ${f.name}`}
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
            disabled={desabilitarGeral || modoVozSemTranscricao || arquivos.length === 0}
          >
            <img src="/icons/enviar.svg" alt="" className="icone-enviar-branco" />
            <span>
              {enviando ? 'Analisando e enviando...' : transcrevendo ? 'Transcrevendo...' : 'Enviar Chamado'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
