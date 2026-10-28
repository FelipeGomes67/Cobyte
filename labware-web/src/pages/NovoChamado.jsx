import React from 'react';
import FormularioNovoChamado from "../components/ticket/FormularioNovoChamado";

export default function NovoChamado() {
  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <small style={{ color: '#2563eb', fontWeight: 'bold' }}>Suporte Labware</small>
      <h1 style={{ fontSize: '22px', margin: '4px 0' }}>Novo Chamado</h1>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        Descreva seu problema por Áudio ou Texto. Nossa Inteligência Artificial cuidará do resto.
      </p>

      <FormularioNovoChamado modoInicial="texto" />
    </div>
  );
}