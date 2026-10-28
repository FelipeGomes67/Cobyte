import React, { useState } from 'react';
import '../../css/FormularioNovoChamado.css';

export default function FormularioNovoChamado({ modoInicial = 'texto' }) {
  const [modo, setModo] = useState(modoInicial);
  const [gravando, setGravando] = useState(false);
  const [tempo, setTempo] = useState('00:00');

  return (
    <div className="create-ticket-card">
      <div className="tabs-modo">
        <button
          type="button"
          className={`tab-btn ${modo === 'voz' ? 'ativo' : ''}`}
          onClick={() => setModo('voz')}
        >
          Relatar por Voz
        </button>
        <button
          type="button"
          className={`tab-btn ${modo === 'texto' ? 'ativo' : ''}`}
          onClick={() => setModo('texto')}
        >
          Digitar Texto
        </button>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {modo === 'texto' ? (
          <div className="form-group">
            <label>
              <strong>Descreva o que aconteceu</strong>
              <small>Inclua o erro apresentado e como afeta o seu trabalho.</small>
            </label>
            <textarea
              className="input-textarea"
              placeholder="Descreva o problema detalhadamente..."
              required
            />
          </div>
        ) : (
          <div className="voz-box">
            <div className="mic-circle">
              🎙️
            </div>
            <p>Fale naturalmente. Estamos aqui para ajudar.</p>
            <h2>{tempo}</h2>
          </div>
        )}

        <div className="form-footer">
          <button type="submit" className="btn-primary-lg">
            Criar Chamado
          </button>
        </div>
      </form>
    </div>
  );
}