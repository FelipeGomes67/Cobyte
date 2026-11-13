import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './css/Layout.css';
import './css/Login.css';
import './css/Perfil.css';
import './css/Configuracoes.css';
import './css/Relatorios.css';
import './css/Chamados.css';
import './css/DialogConfirmacao.css';
import { ProvedorAutenticacao } from './context/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><ProvedorAutenticacao><App /></ProvedorAutenticacao></React.StrictMode>
);
