import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './css/AppLayout.css';
import './css/LoginPage.css';
import './css/ProfilePage.css';
import './css/SettingsPage.css';
import './css/ReportsPage.css';
import './css/TicketsPage.css';
import './css/ConfirmDialog.css';
import { ProvedorAutenticacao } from './context/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><ProvedorAutenticacao><App /></ProvedorAutenticacao></React.StrictMode>
);
