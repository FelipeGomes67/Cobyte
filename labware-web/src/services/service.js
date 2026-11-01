import axios from 'axios';

export const URL_API = 'http://localhost:8080/api';
export const CHAVE_TOKEN = 'labware-token';
export const EVENTO_SESSAO_EXPIRADA = 'labware-sessao-expirada';

export function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

const servico = axios.create({
  baseURL: URL_API,
  timeout: 15000,
});

servico.interceptors.request.use(configuracao => {
  const token = configuracao.autenticada === false ? null : obterToken();
  if (token) configuracao.headers.set('Authorization', `Bearer ${token}`);
  return configuracao;
});

servico.interceptors.response.use(
  resposta => resposta,
  falha => {
    const resposta = falha.response;
    if (falha.config?.autenticada !== false && resposta?.status === 401) {
      localStorage.removeItem(CHAVE_TOKEN);
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    const dados = resposta?.data;
    const detalhes = dados?.campos?.map(campo => campo.mensagem).filter(Boolean).join(' ');
    const mensagem = resposta
      ? detalhes || dados?.mensagem || 'Não foi possível concluir a solicitação.'
      : 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
    const erro = new Error(mensagem);
    erro.status = resposta?.status;
    return Promise.reject(erro);
  },
);

export default servico;
