import MigracaoArquivos from "../components/layout/MigracaoArquivos";
import { useAutenticacao } from "../hooks/useAuth";
import PreferenciasNotificacao from "../components/layout/PreferenciasNotificacao";
import { alterarSenha } from "../services/perfilService";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Save } from "lucide-react";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { usuario } = useAutenticacao();
  const admin = usuario?.perfil === "ADMIN";
  const tab =
    admin && searchParams.get("aba") === "arquivos"
      ? "files"
      : searchParams.get("aba") === "notificacoes"
        ? "notifications"
        : "security";
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [working, setWorking] = useState(false);
  function selectTab(nextTab) {
    setSearchParams(
      nextTab === "files"
        ? { aba: "arquivos" }
        : nextTab === "notifications"
          ? { aba: "notificacoes" }
          : {},
    );
    setMessage("");
  }

  function navegarAbas(evento) {
    const teclas = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (!teclas.includes(evento.key)) return;
    const abas = [...evento.currentTarget.querySelectorAll('[role="tab"]')];
    const indice = abas.indexOf(document.activeElement);
    const proximo =
      evento.key === "Home"
        ? 0
        : evento.key === "End"
          ? abas.length - 1
          : (indice +
              (["ArrowLeft", "ArrowUp"].includes(evento.key) ? -1 : 1) +
              abas.length) %
            abas.length;
    evento.preventDefault();
    abas[proximo]?.focus();
    abas[proximo]?.click();
  }

  async function changePassword(event) {
    event.preventDefault();
    const elemento = event.currentTarget;
    const form = new FormData(elemento);
    if (String(form.get("newPassword") || "").length < 8) {
      setMessage("A nova senha deve ter pelo menos 8 caracteres.");
      setMessageType("error");
      return;
    }
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setMessage("A confirmação não coincide com a nova senha.");
      setMessageType("error");
      return;
    }
    setWorking(true);
    try {
      await alterarSenha(
        String(form.get("currentPassword")),
        String(form.get("newPassword")),
      );
      elemento.reset();
      setShowPassword(false);
      setMessage(
        "Senha alterada com sucesso. Utilize a nova senha no próximo login.",
      );
      setMessageType("success");
    } catch (erro) {
      setMessage(
        erro.response?.data?.message ||
          erro.response?.data?.detail ||
          "Não foi possível alterar a senha.",
      );
      setMessageType("error");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <div className="page-heading settings-heading">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie preferências para a central de suporte</p>
        </div>
      </div>
      <div className="settings-layout">
        <div
          className="settings-tabs"
          onKeyDown={navegarAbas}
          role="tablist"
          aria-label="Configurações da conta"
        >
          <button
            role="tab"
            id="aba-security"
            aria-controls="painel-configuracoes"
            tabIndex={tab === "security" ? 0 : -1}
            aria-selected={tab === "security"}
            className={tab === "security" ? "selected" : ""}
            onClick={() => selectTab("security")}
          >
            Segurança
          </button>
          <button
            role="tab"
            id="aba-notifications"
            aria-controls="painel-configuracoes"
            tabIndex={tab === "notifications" ? 0 : -1}
            aria-selected={tab === "notifications"}
            className={tab === "notifications" ? "selected" : ""}
            onClick={() => selectTab("notifications")}
          >
            Notificações
          </button>
          {admin && (
            <button
              role="tab"
              id="aba-files"
              aria-controls="painel-configuracoes"
              tabIndex={tab === "files" ? 0 : -1}
              aria-selected={tab === "files"}
              className={tab === "files" ? "selected" : ""}
              onClick={() => selectTab("files")}
            >
              Arquivos
            </button>
          )}
        </div>

        <section
          id="painel-configuracoes"
          role="tabpanel"
          aria-labelledby={"aba-" + tab}
          tabIndex={0}
          className={`panel settings-panel settings-reference-card ${tab === "security" ? "security-card" : "notification-card"}`}
        >
          {tab === "security" ? (
            <>
              <div className="settings-panel-heading">
                <h2>Segurança da conta</h2>
              </div>
              <p className="settings-limitation">
                Confirme sua senha atual e escolha uma nova senha de 8 a 72
                caracteres.
              </p>
              <form onSubmit={changePassword}>
                <label className="form-label">
                  Senha Atual
                  <div className="password-wrap">
                    <input
                      name="currentPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                <label className="form-label">
                  Nova Senha
                  <div className="password-wrap">
                    <input
                      name="newPassword"
                      maxLength="72"
                      type={showPassword ? "text" : "password"}
                      minLength="8"
                      autoComplete="new-password"
                      placeholder="••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                <label className="form-label">
                  Confirmar nova senha
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength="8"
                    maxLength="72"
                    required
                  />
                </label>
                <div className="settings-footer">
                  {message && (
                    <span
                      className={`settings-message ${messageType}`}
                      role={messageType === "error" ? "alert" : "status"}
                    >
                      {message}
                    </span>
                  )}
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={working}
                  >
                    <Save size={16} />{" "}
                    {working ? "Atualizando..." : "Atualizar senha"}
                  </button>
                </div>
              </form>
            </>
          ) : tab === "files" ? (
            <MigracaoArquivos />
          ) : (
            <PreferenciasNotificacao />
          )}
        </section>
      </div>
    </>
  );
}
