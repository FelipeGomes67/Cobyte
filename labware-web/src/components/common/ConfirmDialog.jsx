import { useId } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { LogOut, X } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel, busy = false, Icone = LogOut }) {
  const dialogRef = useFocusTrap(open, onCancel);
  const titleId = useId();
  const messageId = useId();

  if (!open) return null;
  return <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <section ref={dialogRef} tabIndex={-1} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
      <button className="dialog-close" disabled={busy} onClick={onCancel} aria-label="Fechar"><X size={17}/></button>
      <span className="dialog-icon"><Icone size={20}/></span>
      <h2 id={titleId}>{title}</h2><p id={messageId}>{message}</p>
      <div className="dialog-actions"><button className="secondary-button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="danger-button" disabled={busy} onClick={onConfirm}>{confirmLabel}</button></div>
    </section>
  </div>;
}
