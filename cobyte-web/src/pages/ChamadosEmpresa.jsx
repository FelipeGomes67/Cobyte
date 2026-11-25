import EstadoConteudo from "../components/common/EstadoConteudo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAutenticacao } from "../hooks/useAuth";
import { useTickets } from "../hooks/useTickets";
import { useEstadoUrl } from "../hooks/useEstadoUrl";
import TabelaChamados from "../components/ticket/TabelaChamados";
import "../css/ChamadosEmpresa.css";

export default function ChamadosEmpresa() {
  const { usuario } = useAutenticacao();
  const nomeEmpresa =
    typeof usuario?.empresa === "object"
      ? usuario.empresa?.nome
      : usuario?.empresa;
  const [busca, definirBusca] = useEstadoUrl("busca", "");
  const [situacao, definirSituacao] = useEstadoUrl("situacao", "ativos");
  const [tentativa, definirTentativa] = useState(0);
  const { tickets: lista, loading, error } = useTickets("empresa", tentativa);
  const dados = { chamados: lista, carregando: loading, erro: error };

  const encerrados = ["Resolvido", "Fechado", "Cancelado"];
  const historico = situacao === "encerrados";
  const chamados = dados.chamados.filter(
    (chamado) => encerrados.includes(chamado.status) === historico,
  );

  return (
    <div className="chamados-empresa-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Central de Suporte</div>
          <h1>Chamados da empresa</h1>
          <p>
            {nomeEmpresa
              ? `Acompanhe os chamados da empresa ${nomeEmpresa}.`
              : "Acompanhe os chamados da sua empresa."}
          </p>
        </div>
        <Link className="primary-button" to="/chamados/novo">
          Novo chamado
        </Link>
      </div>
      <div
        className="empresa-situacao"
        role="group"
        aria-label="Situação dos chamados"
      >
        <button
          type="button"
          aria-pressed={!historico}
          onClick={() => definirSituacao("ativos")}
        >
          Em andamento
        </button>
        <button
          type="button"
          aria-pressed={historico}
          onClick={() => definirSituacao("encerrados")}
        >
          Encerrados
        </button>
      </div>
      {dados.erro && dados.chamados.length > 0 && (
        <EstadoConteudo
          tipo="erro"
          mensagem={dados.erro}
          onTentar={() => definirTentativa((v) => v + 1)}
        />
      )}
      {dados.carregando ? (
        <EstadoConteudo
          tipo="carregando"
          mensagem="Carregando chamados da empresa..."
        />
      ) : dados.erro && !dados.chamados.length ? (
        <EstadoConteudo
          tipo="erro"
          mensagem={dados.erro}
          onTentar={() => definirTentativa((v) => v + 1)}
        />
      ) : (
        <TabelaChamados
          ocultarEmpresa
          key={situacao}
          tickets={chamados}
          query={busca}
          onSearch={definirBusca}
          titulo="Chamados da empresa"
          historico={historico}
          rotaBase="/chamados-empresa"
        />
      )}
    </div>
  );
}
