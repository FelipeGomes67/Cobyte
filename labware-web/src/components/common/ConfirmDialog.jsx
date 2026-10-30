import { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <button className="dialog-close" onClick={onCancel} aria-label="Fechar"><X size={17}/></button>
      <span className="dialog-icon"><LogOut size={20}/></span>
      <h2 id="confirm-title">{title}</h2><p id="confirm-message">{message}</p>
      <div className="dialog-actions"><button className="secondary-button" onClick={onCancel}>Cancelar</button><button className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div>
    </section>
  </div>;
}
