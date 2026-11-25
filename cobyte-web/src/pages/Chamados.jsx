import { useState } from "react";
import EstadoConteudo from "../components/common/EstadoConteudo";
import { useEstadoUrl } from "../hooks/useEstadoUrl";
import { useTickets } from "../hooks/useTickets";
import { useNavigate } from "react-router-dom";
import { Headset } from "lucide-react";
import { useAutenticacao } from "../hooks/useAuth";
import TabelaChamados from "../components/ticket/TabelaChamados";

const emailSuporte = import.meta.env.VITE_EMAIL_SUPORTE?.trim();

function Heading({ title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">Central de Suporte</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function TicketsPage({ mode }) {
  const [query, setQuery] = useEstadoUrl("busca", "");
  const [tentativa, setTentativa] = useState(0);
  const {
    tickets: chamadosApi,
    loading,
    error,
  } = useTickets("pessoal", tentativa);
  const navigate = useNavigate();
  const { usuario: user } = useAutenticacao();
  const ehSuporte =
    user?.role === "support" ||
    user?.perfil === "SUPORTE" ||
    user?.perfil === "ADMIN";
  const ehCliente = user?.perfil === "CLIENTE" || user?.role === "client";

  const meus = chamadosApi.filter((ticket) => {
    if (
      ehSuporte &&
      user?.id != null &&
      ticket.tecnicos?.some((tecnico) => String(tecnico.id) === String(user.id))
    )
      return true;
    const id = ehSuporte ? ticket.responsavelId : ticket.solicitanteId;
    return id != null && user?.id != null && String(id) === String(user.id);
  });
  let tickets = mode === "mine" || !ehSuporte ? meus : chamadosApi;
  const finalizados = ["Resolvido", "Fechado", "Cancelado"];
  tickets = tickets.filter((ticket) =>
    mode === "history"
      ? finalizados.includes(ticket.status)
      : !finalizados.includes(ticket.status),
  );
  const title =
    mode === "history"
      ? "Histórico de chamados"
      : mode === "mine" || !ehSuporte
        ? "Meus chamados"
        : "Todos os chamados";

  const createButton = ehCliente ? (
    <button
      className="primary-button btn-novo-chamado"
      onClick={() => navigate("/chamados/novo")}
    >
      <span>＋</span> Novo chamado
    </button>
  ) : null;
  return (
    <>
      <Heading
        title={title}
        description="Acompanhe solicitações e atualizações da equipe de suporte."
        action={createButton}
      />
      {loading && (
        <EstadoConteudo tipo="carregando" mensagem="Carregando chamados..." />
      )}
      {error && (
        <EstadoConteudo
          tipo="erro"
          mensagem={error}
          onTentar={() => setTentativa((v) => v + 1)}
        />
      )}
      {!loading && (!error || chamadosApi.length > 0) && (
        <TabelaChamados
          ocultarFiltroResponsavel={
            mode === "mine" || (!ehSuporte && mode !== "history")
          }
          porPrioridade={mode === "mine"}
          historico={mode === "history"}
          titulo={mode === "history" ? "Histórico de chamados" : "Solicitações"}
          tickets={tickets}
          query={query}
          onSearch={setQuery}
          rotaBase="/chamados"
        />
      )}
      <div className="list-note">
        <Headset size={17} /> Precisa de ajuda?{" "}
        {emailSuporte
          ? <a href={`mailto:${emailSuporte}`}>Fale com o suporte Cobyte</a>
          : <span>Fale com a equipe de suporte da sua empresa.</span>}
      </div>
    </>
  );
}

export function MeusChamados() {
  return <TicketsPage mode="mine" />;
}
