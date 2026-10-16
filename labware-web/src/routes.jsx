import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Componente temporário para validar a renderização das rotas
function PlaceholderScreen({ title }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">LABWARE</h1>
        <p className="text-slate-600 font-medium">{title}</p>
        <span className="inline-block mt-4 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
          Em Desenvolvimento
        </span>
      </div>
    </div>
  );
}

export default function RoutesApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PlaceholderScreen title="Página de Login" />} />
        <Route path="/chamados" element={<PlaceholderScreen title="Histórico de Chamados" />} />
        <Route path="/chamados/novo" element={<PlaceholderScreen title="Abertura de Chamado" />} />
        <Route path="/chamados/:id" element={<PlaceholderScreen title="Detalhe do Chamado & Chat" />} />
        
        {/* Rota padrão: redireciona para a lista de chamados */}
        <Route path="*" element={<Navigate to="/chamados" replace />} />
      </Routes>
    </BrowserRouter>
  );
}