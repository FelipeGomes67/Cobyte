import api from './api.js';

// Converte um AudioBuffer decodificado em um Blob WAV PCM de 16-bit
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result;
  if (numChannels === 2) {
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.getChannelData(1);
    result = new Float32Array(ch0.length + ch1.length);
    for (let i = 0, j = 0; i < ch0.length; i++) {
      result[j++] = ch0[i];
      result[j++] = ch1[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = result.length * bytesPerSample;
  const bufferLength = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (v, offset, str) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Prepara um arquivo com extensão aceita pelo STT (.wav, .mp3, .ogg, .m4a, .flac)
export async function prepararArquivoAudio(blob) {
  if (blob instanceof File && blob.name.match(/\.(wav|mp3|ogg|m4a|flac)$/i)) {
    return blob;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWav(audioBuffer);
      await audioCtx.close();
      return new File([wavBlob], 'audio.wav', { type: 'audio/wav' });
    }
  } catch {
    // Se a decodificação Web Audio falhar, usa o blob encapsulado com extensão .wav
  }

  return new File([blob], 'gravacao.wav', { type: blob.type || 'audio/wav' });
}

// Envia áudio gravado para o endpoint de prévia STT da API
export async function transcreverAudio(audioBlobOuFile) {
  if (!audioBlobOuFile) {
    throw new Error('Nenhum áudio fornecido para transcrição.');
  }

  const arquivo = await prepararArquivoAudio(audioBlobOuFile);

  const formData = new FormData();
  formData.append('arquivo', arquivo, arquivo.name || 'audio.wav');

  try {
    const { data } = await api.post('/chamados/transcrever-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });

    return data;
  } catch (erro) {
    const status = erro.status || erro.response?.status;
    if (status === 422) {
      throw new Error('Não foi detectada fala compreensível no áudio. Fale mais próximo ao microfone e tente novamente.', { cause: erro });
    }
    if (status === 413) {
      throw new Error('O áudio excede o limite máximo permitido de 10 MB.', { cause: erro });
    }
    if (status === 502 || status === 503 || status === 504) {
      throw new Error('O serviço de transcrição por inteligência artificial está indisponível no momento. Você pode digitar o relato diretamente.', { cause: erro });
    }
    throw new Error(erro.message || 'Falha ao processar a transcrição do áudio.', { cause: erro });
  }
}
