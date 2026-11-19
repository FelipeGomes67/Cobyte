import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import '../../css/FormModal.css';

export default function FormModal({ open, title, busy = false, onClose, children }) {
  const tituloId = useId();
  const ref = useFocusTrap(open, () => { if (!busy) onClose(); });
  return createPortal(
    <div className={"form-modal-backdrop" + (open ? " is-open" : "")} aria-hidden={!open} inert={!open} onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <section ref={ref} className="form-modal admin-page" role="dialog" aria-modal="true"
        aria-labelledby={tituloId} aria-busy={busy} tabIndex={-1}>
        <header className="form-modal-header">
          <h2 id={tituloId}>{title}</h2>
          <button type="button" className="form-modal-close" onClick={onClose} disabled={busy} aria-label="Fechar janela">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>, document.body);
}
