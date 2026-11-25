import EstadoConteudo from "../components/common/EstadoConteudo";
import { useEffect, useState } from "react";
import { listarEmpresas } from "../services/perfilService";
import {
  listarUsuariosPendentes,
  aprovarUsuario,
} from "../services/usuarioService";
import "../css/UsuariosPendentes.css";

export default function UsuariosPendentes() {
  const [tentativa, setTentativa] = useState(0);
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [selecoes, setSelecoes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState({});
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    let ativo = true;
    Promise.all([listarUsuariosPendentes(), listarEmpresas()])
      .then(([pendentes, oficiais]) => {
        if (ativo) {
          setUsuarios(pendentes);
          setEmpresas(oficiais);
        }
      })
      .catch((falha) => {
        if (ativo) setErro(falha.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  async function aprovar(usuario) {
    setErro("");
    setMensagem("");
    setSalvando((atual) => ({ ...atual, [usuario.id]: true }));
    try {
      await aprovarUsuario(usuario.id, Number(selecoes[usuario.id]));
      setUsuarios((atual) => atual.filter((item) => item.id !== usuario.id));
      setMensagem(`${usuario.nome} foi aprovado e vinculado à empresa.`);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando((atual) => ({ ...atual, [usuario.id]: false }));
    }
  }

  return (
    <div className="pending-users-page">
      <div className="page-heading">
        <div>
          <h1>Usuários pendentes</h1>
          <p>
            Confira a empresa informada e selecione o cadastro oficial para
            liberar o cliente.
          </p>
        </div>
      </div>
      {erro && (
        <EstadoConteudo
          tipo="erro"
          mensagem={erro}
          onTentar={() => {
            setErro("");
            setCarregando(true);
            setTentativa((v) => v + 1);
          }}
        />
      )}
      {mensagem && <p role="status">{mensagem}</p>}
      {carregando ? (
        <EstadoConteudo
          tipo="carregando"
          mensagem="Carregando usuários e empresas..."
        />
      ) : (
        !erro && (
          <section className="panel">
            {usuarios.length === 0 ? (
              <p className="empty-state">
                Nenhum usuário aguardando vinculação.
              </p>
            ) : (
              <div
                className="pending-users-table"
                role="region"
                tabIndex={0}
                aria-label="Usuários pendentes; role horizontalmente para ver todas as colunas"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">E-mail</th>
                      <th scope="col">Empresa informada pelo cliente</th>
                      <th scope="col">Empresa oficial</th>
                      <th scope="col">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td>{usuario.nome}</td>
                        <td>{usuario.email}</td>
                        <td>{usuario.empresaInformada || "Não informada"}</td>
                        <td>
                          <select
                            aria-label={`Empresa para ${usuario.nome}`}
                            value={selecoes[usuario.id] || ""}
                            disabled={salvando[usuario.id]}
                            onChange={(evento) =>
                              setSelecoes((atual) => ({
                                ...atual,
                                [usuario.id]: evento.target.value,
                              }))
                            }
                          >
                            <option value="">Selecione uma empresa</option>
                            {empresas.map((empresa) => (
                              <option key={empresa.id} value={empresa.id}>
                                {empresa.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            className="primary-button"
                            disabled={
                              !selecoes[usuario.id] || salvando[usuario.id]
                            }
                            onClick={() => aprovar(usuario)}
                          >
                            {salvando[usuario.id]
                              ? "Vinculando..."
                              : "Aprovar e Vincular"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {empresas.length === 0 && (
              <p className="empty-state">
                Cadastre uma empresa oficial para aprovar os clientes.
              </p>
            )}
          </section>
        )
      )}
    </div>
  );
}
