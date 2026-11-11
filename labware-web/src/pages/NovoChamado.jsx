import { Navigate } from "react-router-dom";
import FormularioNovoChamado from "../components/ticket/FormularioNovoChamado";
import { useAutenticacao } from "../hooks/useAuth";

export default function NovoChamado() {
  const { usuario } = useAutenticacao();
  const ehCliente = usuario?.perfil === 'CLIENTE' || usuario?.role === 'client';

  if (!ehCliente) {
    return <Navigate to="/chamados" replace />;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <FormularioNovoChamado modoInicial="texto" />
    </div>
  );
}
