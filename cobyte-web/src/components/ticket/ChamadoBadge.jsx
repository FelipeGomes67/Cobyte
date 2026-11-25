import { obterVisualChamado } from '../../utils/chamadoVisual';
import '../../css/ChamadoBadge.css';

export default function ChamadoBadge({ valor, tipo = 'status' }) {
  const visual = obterVisualChamado(valor, tipo);
  return (
    <span className="chamado-badge" style={{ '--badge-cor': visual.cor, '--badge-fundo': visual.fundo }}>
      {tipo === 'status' && <i aria-hidden="true" />}
      {visual.nome}
    </span>
  );
}
