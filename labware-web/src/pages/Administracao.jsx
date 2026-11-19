import FormModal from '../components/common/FormModal';
import { Pencil, Plus } from 'lucide-react';
import '../css/ListaChamados.css';
import EstadoConteudo from "../components/common/EstadoConteudo";
import { useEffect, useState } from "react";
import { listarEmpresas } from "../services/perfilService";
import { useAutenticacao } from "../hooks/useAuth";
import api from "../services/api";
import "../css/Administracao.css";

export default function Administracao({ tipo }) {
  const { usuario } = useAutenticacao();
  const [novoCadastro, setNovoCadastro] = useState(false);
  const [edicao, setEdicao] = useState(null);
  const [opcoesEmpresas, setOpcoesEmpresas] = useState([]);
  const [erroEmpresas, setErroEmpresas] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => {
    let ativo = true;
    listarEmpresas()
      .then((lista) => {
        if (ativo) setOpcoesEmpresas(lista);
      })
      .catch(() => {
        if (ativo)
          setErroEmpresas(
            "Não foi possível carregar as empresas. Atualize a página para tentar novamente.",
          );
      });
    return () => {
      ativo = false;
    };
  }, []);
  const empresas = tipo === "empresas";
  const [busca, setBusca] = useState("");
  const [perfil, setPerfil] = useState("");
  const [page, setPage] = useState(0);
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState({
    carregando: true,
    dados: null,
    erro: "",
  });
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    let ativo = true;
    const timer = setTimeout(async () => {
      setEstado({ carregando: true, dados: null, erro: "" });
      try {
        const { data } = await api.get("/admin/" + tipo, {
          params: {
            page,
            ...(!empresas && { busca, perfil: perfil || undefined }),
          },
        });
        if (!Array.isArray(data?.content)) throw new Error("Resposta inválida ao carregar os registros.");
        if (ativo) setEstado({ carregando: false, dados: data, erro: "" });
      } catch (erro) {
        if (ativo)
          setEstado({
            carregando: false,
            dados: null,
            erro: erro.message || "Não foi possível carregar a lista.",
          });
      }
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [tipo, empresas, page, busca, perfil, versao]);
  async function cadastrar(event) {
    event.preventDefault();
    setSalvando(true);
    setAviso("");
    try {
      await api.post("/empresas", { nome: nome.trim(), cnpj: cnpj.trim() });
      setNome("");
      setCnpj("");
      setNovoCadastro(false);
      setPage(0);
      setVersao((v) => v + 1);
      setAviso("Empresa cadastrada com sucesso.");
    } catch (erro) {
      setAviso(erro.message || "Não foi possível cadastrar a empresa.");
    } finally {
      setSalvando(false);
    }
  }
  async function salvarUsuario(event) {
    event.preventDefault();
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    if (salvando) return;
    setSalvando(true);
    setAviso("");
    try {
      await api.patch("/admin/usuarios/" + edicao.id, {
        perfil: edicao.perfil,
        empresaId:
          edicao.perfil === "CLIENTE" && edicao.empresaId
            ? Number(edicao.empresaId)
            : null,
      });
      setEdicao(null);
      setConfirmando(false);
      setVersao((v) => v + 1);
      setAviso("Perfil e empresa atualizados com sucesso.");
    } catch (erro) {
      setAviso(erro.message || "Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }
  function fecharModal() {
    if (salvando) return;
    setNovoCadastro(false);
    setEdicao(null);
    setConfirmando(false);
    setAviso("");
  }
  const dados = estado.dados;
  return (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Central de Suporte</div>
          <h1>{empresas ? "Gerenciar empresas" : "Gerenciar usuários"}</h1>
          <p>{empresas
            ? "Consulte as empresas e cadastre novos vínculos para atendimento."
            : "Consulte as contas, os perfis de acesso e os vínculos de empresa."}</p>
        </div>
        {empresas && <button type="button" className="primary-button admin-nova-empresa"
          disabled={salvando} aria-expanded={novoCadastro} aria-controls="cadastro-empresa"
          onClick={() => { setAviso(""); setNovoCadastro(true); }}>
          <Plus size={17} /> Nova empresa
        </button>}
      </div>
      {aviso && !novoCadastro && !edicao && <div className="admin-aviso" role="status">{aviso}</div>}
      <FormModal open={empresas && novoCadastro} title="Nova empresa" busy={salvando} onClose={fecharModal}>
        {aviso && <div className="admin-aviso" role="alert">{aviso}</div>}
        <form id="cadastro-empresa" className="panel admin-form" onSubmit={cadastrar}>
          <label>
            Nome
            <input
              required
              maxLength={255}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
          <label>
            CNPJ
            <input
              required
              maxLength={18}
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
            />
          </label>
          <button className="primary-button" disabled={salvando}>
            {salvando ? "Salvando..." : "Cadastrar empresa"}
          </button>
          <button type="button" className="secondary-button" disabled={salvando} onClick={fecharModal}>Cancelar</button>
        </form>
      </FormModal>
      {!empresas && (
        <section
          className="chamados-filtros admin-filters"
          aria-label="Filtros de usuários"
        >
          <label>
            Buscar por nome ou e-mail
            <input
              type="search"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPage(0);
              }}
              placeholder="Pesquisar usuários"
            />
          </label>
          <label>
            Perfil
            <select
              value={perfil}
              onChange={(e) => {
                setPerfil(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todos os perfis</option>
              <option value="CLIENTE">Cliente</option>
              <option value="SUPORTE">Suporte</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
        </section>
      )}
      <FormModal open={!!edicao} title="Editar usuário" busy={salvando} onClose={fecharModal}>
        {aviso && <div className="admin-aviso" role="alert">{aviso}</div>}
        {edicao && <form className="panel admin-form" onSubmit={salvarUsuario}>
          <h2>{edicao.nome}</h2>
          <p>{edicao.email}</p>
          <label>
            Perfil
            <select
              disabled={salvando || String(edicao.id) === String(usuario?.id)}
              value={edicao.perfil}
              onChange={(e) => {
                setEdicao({ ...edicao, perfil: e.target.value, empresaId: "" });
                setConfirmando(false);
              }}
            >
              <option value="CLIENTE">Cliente</option>
              <option value="SUPORTE">Suporte</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          {edicao.perfil === "CLIENTE" ? (
            <label>
              Empresa
              <select
                disabled={salvando || !!erroEmpresas}
                value={edicao.empresaId}
                onChange={(e) => {
                  setEdicao({ ...edicao, empresaId: e.target.value });
                  setConfirmando(false);
                }}
              >
                <option value="">Sem empresa — aguardando vínculo</option>
                {edicao.empresaId &&
                  !opcoesEmpresas.some(
                    (e) => String(e.id) === String(edicao.empresaId),
                  ) && (
                    <option value={edicao.empresaId} disabled>
                      {edicao.empresaNome} (indisponível)
                    </option>
                  )}
                {opcoesEmpresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>Suporte e ADMIN não possuem empresa vinculada.</p>
          )}
          {erroEmpresas && <p role="alert">{erroEmpresas}</p>}
          {confirmando && (
            <p role="alert">
              Confirme a alteração de perfil e empresa de {edicao.nome}. As
              permissões serão atualizadas; alterar a empresa muda o acesso aos
              chamados da empresa.
            </p>
          )}
          <button
            className="primary-button"
            disabled={
              salvando || (edicao.perfil === "CLIENTE" && !!erroEmpresas)
            }
          >
            {salvando
              ? "Salvando..."
              : confirmando
                ? "Confirmar alterações"
                : "Salvar alterações"}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={salvando}
            onClick={() => {
              setEdicao(null);
              setConfirmando(false);
              setAviso("");
            }}
          >
            Cancelar
          </button>
        </form>}
      </FormModal>
      <section
        className="panel tickets-panel admin-list-panel"
        aria-label={empresas ? "Lista de empresas" : "Lista de usuários"}
        aria-busy={estado.carregando}
      >
        {estado.carregando ? (
          <EstadoConteudo
            tipo="carregando"
            mensagem="Carregando registros..."
          />
        ) : estado.erro ? (
          <EstadoConteudo
            tipo="erro"
            mensagem={estado.erro}
            onTentar={() => setVersao((v) => v + 1)}
          />
        ) : (
          <>
            <div className="admin-list-heading">
              <h2>{empresas ? "Empresas cadastradas" : "Usuários cadastrados"}</h2>
              <span>{dados?.totalElements || 0} {empresas ? "empresas" : "usuários"}</span>
            </div>
            <div
              className="ticket-table-wrap admin-table"
              role="region"
              tabIndex={0}
              aria-label="Registros administrativos; role horizontalmente para ver todas as colunas"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    {empresas ? (
                      <>
                        <th scope="col">CNPJ</th>
                        <th scope="col">Situação</th>
                      </>
                    ) : (
                      <>
                        <th scope="col">E-mail</th>
                        <th scope="col">Perfil</th>
                        <th scope="col">Empresa</th>
                        <th scope="col">Ações</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dados?.content.map((item) => (
                    <tr key={item.id}>
                      <td className="admin-registro-nome">{item.nome}</td>
                      {empresas ? (
                        <>
                          <td>{item.cnpj}</td>
                          <td><span className={"admin-badge " + (item.ativa ? "admin-badge-ativa" : "admin-badge-inativa")}>{item.ativa ? "Ativa" : "Inativa"}</span></td>
                        </>
                      ) : (
                        <>
                          <td>{item.email}</td>
                          <td><span className={"admin-badge admin-badge-" + item.perfil?.toLowerCase()}>{({ CLIENTE: "Cliente", SUPORTE: "Suporte", ADMIN: "Administrador" })[item.perfil] || item.perfil}</span></td>
                          <td>
                            {item.empresaNome ||
                              (item.perfil === "CLIENTE"
                                ? "Aguardando vínculo" +
                                  (item.empresaInformada
                                    ? " — " + item.empresaInformada
                                    : "")
                                : "Não se aplica")}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="chamado-ver-detalhes admin-editar"
                              aria-label={"Editar usuário " + item.nome}
                              disabled={salvando}
                              onClick={() => {
                                setEdicao({
                                  ...item,
                                  empresaId:
                                    item.empresaId == null
                                      ? ""
                                      : String(item.empresaId),
                                });
                                setConfirmando(false);
                                setAviso("");
                              }}
                            >
                              <Pencil size={13} aria-hidden="true" /> Editar
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!dados?.content.length && (
              <EstadoConteudo mensagem="Nenhum registro encontrado para os filtros selecionados." />
            )}
            <footer className="chamados-rodape">
              <span>{dados?.totalElements ? "Mostrando " + (page * 20 + 1) + "–" + (page * 20 + dados.content.length) + " de " + dados.totalElements : "Nenhum registro"}</span>
              <nav className="chamados-paginacao" aria-label={empresas ? "Paginação de empresas" : "Paginação de usuários"}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page + 1} de {Math.max(1, dados?.totalPages || 0)}
              </span>
              <button
                disabled={!dados || page + 1 >= dados.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
              </nav>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
