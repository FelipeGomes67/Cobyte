import { useSearchParams } from 'react-router-dom';

// Estado de navegação preservado pelo histórico do navegador e por recargas.
export function useEstadoUrl(chave, inicial) {
  const [parametros, setParametros] = useSearchParams();
  function ler(params) {
    const texto = params.get(chave);
    if (texto == null) return inicial;
    if (typeof inicial === 'string') return texto;
    try {
      const valor = JSON.parse(texto);
      if (typeof inicial === 'boolean') return typeof valor === 'boolean' ? valor : inicial;
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return inicial;
      return Object.fromEntries(Object.entries(inicial).map(([campo, padrao]) =>
        [campo, typeof valor[campo] === typeof padrao ? valor[campo] : padrao]));
    } catch { return inicial; }
  }
  const valor = ler(parametros);
  function atualizar(proximo) {
    setParametros(anteriores => {
      const novo = typeof proximo === 'function' ? proximo(ler(anteriores)) : proximo;
      const copia = new URLSearchParams(anteriores);
      if (JSON.stringify(novo) === JSON.stringify(inicial)) copia.delete(chave);
      else copia.set(chave, typeof novo === 'string' ? novo : JSON.stringify(novo));
      return copia;
    }, { replace: true });
  }
  return [valor, atualizar];
}
