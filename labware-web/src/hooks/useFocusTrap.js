import { useEffect, useRef } from 'react';

// Restringe o teclado à superfície aberta e restaura o foco ao fechá-la.
export function useFocusTrap(ativo, aoFechar) {
  const raiz = useRef(null);
  const fechar = useRef(aoFechar);
  const ultimoFoco = useRef(null);
  useEffect(() => {
    if (ativo) return;
    function lembrar() {
      const atual = document.activeElement;
      if (atual && atual !== document.body) ultimoFoco.current = atual;
    }
    lembrar();
    document.addEventListener('focusin', lembrar);
    return () => document.removeEventListener('focusin', lembrar);
  }, [ativo]);
  useEffect(() => { fechar.current = aoFechar; }, [aoFechar]);
  useEffect(() => {
    if (!ativo || !raiz.current) return;
    const origem = ultimoFoco.current || document.activeElement;
    const elemento = raiz.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focaveis = () => [...elemento.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
      .filter(item => item.getClientRects().length && !item.closest('[hidden],[inert]'));
    (focaveis()[0] || elemento).focus();
    function teclado(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        fechar.current?.();
      }
      if (evento.key !== 'Tab') return;
      const itens = focaveis();
      const primeiro = itens[0], ultimo = itens.at(-1);
      if (!primeiro) { evento.preventDefault(); elemento.focus(); return; }
      if (!elemento.contains(document.activeElement) || (evento.shiftKey && document.activeElement === primeiro)) {
        evento.preventDefault(); (evento.shiftKey ? ultimo : primeiro).focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault(); primeiro.focus();
      }
    }
    elemento.addEventListener('keydown', teclado);
    return () => {
      elemento.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
      if (origem?.isConnected && !origem.closest('[inert]')) origem.focus();
    };
  }, [ativo]);
  return raiz;
}
