import React from 'react';
import DetalhesCliente from '../components/ticket/DetalhesCliente';

export default function DetalhesChamado({ status = 'ABERTO' }) {
  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <small style={{ color: '#2563eb', fontWeight: 'bold' }}>Suporte Labware</small>
      <h1 style={{ fontSize: '22px', margin: '4px 0 20px 0' }}>Detalhes do Chamado</h1>

      <DetalhesCliente status={status} />
    </div>
  );
}