import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

const notificacoesRecentes = [
  {
    id: 1,
    chamadoId: '102',
    titulo: 'Nova mensagem em Chamado #102',
    tempo: 'Há 2 min',
  },
  {
    id: 2,
    chamadoId: '104',
    titulo: 'SLA Excedido em Chamado #104',
    tempo: 'Há 10 min',
  },
  {
    id: 3,
    chamadoId: '108',
    titulo: 'Nova mensagem do Suporte no chamado #108',
    tempo: 'Hoje às 09:20',
  },
];

export default function NotificationDropdown({ onClose, onViewAll }) {
  const navigate = useNavigate();

  const handleItemClick = (chamadoId) => {
    if (onClose) onClose();
    if (chamadoId) {
      navigate(`/chamados/${chamadoId}`);
    } else {
      navigate('/notificacoes');
    }
  };

  return (
    <section className="notification-dropdown-card" aria-label="Notificações recentes">
      <div className="notification-dropdown-header">
        <h3>Notificações</h3>
      </div>

      <div className="notification-dropdown-list">
        {notificacoesRecentes.map((item) => (
          <div
            key={item.id}
            className="notification-dropdown-item"
            onClick={() => handleItemClick(item.chamadoId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleItemClick(item.chamadoId)}
          >
            <div className="notification-dropdown-icon">
              <MessageSquare size={16} strokeWidth={2.2} />
            </div>
            <div className="notification-dropdown-copy">
              <strong>{item.titulo}</strong>
              <small>{item.tempo}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="notification-dropdown-footer">
        <button
          type="button"
          className="btn-ver-todas-notificacoes"
          onClick={onViewAll}
        >
          Ver todas as notificações
        </button>
      </div>
    </section>
  );
}

