import React from 'react';
import '../../css/DetalhesCliente.css';

export default function DetalhesCliente({ status = 'ABERTO' }) {
  return (
    <div className="detalhes-cliente-container">
      <div className="card-detalhes">
        <div className="card-header">
          <h2>Chamado #3142</h2>
          <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
        </div>
        <div className="card-body">
          <p><strong>Assunto:</strong> Sistema ERP não está carregando relatórios financeiros.</p>
          <p><strong>Aberto em:</strong> 28/10/2026 às 10:00</p>
        </div>
      </div>

      <div className="card-sla">
        <h3>SLA de Atendimento</h3>
        <div className="sla-timer">
          <span className="time-left">02h 45m restantes para o primeiro atendimento</span>
        </div>
      </div>
    </div>
  );
}