import api, {
  API_BASE_URL,
  CHAVE_TOKEN,
  EVENTO_SESSAO_EXPIRADA,
  obterToken,
  salvarToken,
  removerToken,
} from './api.js';

export const URL_API = `${API_BASE_URL}/api`;
export { CHAVE_TOKEN, EVENTO_SESSAO_EXPIRADA, obterToken, salvarToken, removerToken };

export default api;
