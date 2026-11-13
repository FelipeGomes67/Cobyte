import { Link } from 'react-router-dom';
import EditorFoto from '../components/layout/EditorFoto';
import { useEffect, useState } from 'react';
import { useAutenticacao } from '../hooks/useAuth';
import { obterPerfil, atualizarPerfil, enviarFoto, obterResumoAvaliacoes } from '../services/perfilService';

export default function ProfilePage() {
  const { usuario: user, atualizarUsuario } = useAutenticacao();
  const [foto, setFoto] = useState(null);
  const suporte = user?.perfil === 'SUPORTE' || user?.perfil === 'ADMIN';
  const [avaliacoes, setAvaliacoes] = useState(null);
  const [erroAvaliacoes, setErroAvaliacoes] = useState('');
  useEffect(() => {
    if (!suporte) return;
    let ativo = true;
    obterResumoAvaliacoes().then(dados => { if (ativo) setAvaliacoes(dados); })
      .catch(() => { if (ativo) setErroAvaliacoes('Não foi possível carregar as avaliações.'); });
    return () => { ativo = false; };
  }, [suporte, user?.id]);

  const initialData = {
    name: user?.name || user?.nome || '',
    email: user?.email || '',
    cargo: user?.cargo || '',
    tel: user?.telefone || user?.tel || '',
    empresaId: user?.empresaId ? String(user.empresaId) : '',
  };

  const [form, setForm] = useState(initialData);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: '', mensagem: '' });

  // Carrega os dados completos do perfil.
  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      try {
        const perfil = await obterPerfil();
        if (!ativo) return;
        if (perfil) {
          const p = perfil;
          const dadosMapeados = {
            name: p.nome || user?.name || user?.nome || '',
            email: p.email || user?.email || '',
            cargo: p.cargo || '',
            tel: p.telefone || user?.telefone || '',
            empresaId: p.empresaId ? String(p.empresaId) : '',
          };
          setForm(dadosMapeados);
          if (atualizarUsuario) {
            atualizarUsuario(p);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [atualizarUsuario, user?.email, user?.name, user?.nome, user?.telefone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
    if (feedback.mensagem) {
      setFeedback({ tipo: '', mensagem: '' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: '', mensagem: '' });

    if (!form.name.trim()) {
      setFeedback({ tipo: 'error', mensagem: 'O campo Nome Completo é obrigatório.' });
      return;
    }

    if (!form.email.trim()) {
      setFeedback({ tipo: 'error', mensagem: 'O campo Email é obrigatório.' });
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        nome: form.name.trim(),
        email: form.email.trim(),
        cargo: form.cargo.trim() || null,
        telefone: form.tel.trim() || null,
      };

      let perfilAtualizado = await atualizarPerfil(payload);
      atualizarUsuario(perfilAtualizado);
      if (foto) { perfilAtualizado = await enviarFoto(foto); setFoto(null); }

      const dadosMapeados = {
        name: perfilAtualizado.nome || form.name,
        email: perfilAtualizado.email || form.email,
        cargo: perfilAtualizado.cargo || form.cargo,
        tel: perfilAtualizado.telefone || form.tel,
        empresaId: perfilAtualizado.empresaId ? String(perfilAtualizado.empresaId) : form.empresaId,
      };

      setForm(dadosMapeados);
      if (atualizarUsuario) {
        atualizarUsuario(perfilAtualizado);
      }

      setFeedback({ tipo: 'success', mensagem: 'Alterações salvas com sucesso!' });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Não foi possível salvar as alterações.';
      setFeedback({ tipo: 'error', mensagem: msg });
    } finally {
      setSalvando(false);
    }
  };

  const temEmpresaVinculada = Boolean(user?.empresaId || user?.empresaNome || user?.empresa);
  const empresaTexto = temEmpresaVinculada
    ? (user?.empresaNome || user?.empresa)
    : (user?.empresaInformada
        ? `Aguardando vinculação (Informada: ${user.empresaInformada})`
        : 'Aguardando vinculação (Não informada)');

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Central de Suporte</div>
          <h1>Perfil</h1>
        </div>
      </div>

      <section className="panel profile-panel">
        {/* Cabeçalho do perfil */}
        <div className="profile-top">
          <EditorFoto user={user} onPreparar={setFoto} />

          <div className="profile-header">
            <h2>{form.name || 'Usuário'}</h2>
            <p>{form.email || 'usuario@labware.com.br'}</p>
          </div>


        </div>

        {/* Informações abaixo do cabeçalho */}
        <div className="profile-content">
          <h2>Informações</h2>

          {feedback.mensagem && (
            <div
              className={`profile-feedback ${
                feedback.tipo === 'success' ? 'feedback-success' : 'feedback-error'
              }`}
              role="alert"
            >
              {feedback.mensagem}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="profile-info">
              {/* Linha 1: Nome Completo e Email */}
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nome Completo"
                required
                disabled={salvando}
              />

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                required
                disabled={salvando}
              />

              {/* Linha 2: Cargo e Empresa */}
              <input
                name="cargo"
                value={form.cargo}
                onChange={handleChange}
                placeholder="Cargo"
                disabled={salvando}
              />

              {user?.perfil === 'CLIENTE' && <div
                className={`profile-company ${!temEmpresaVinculada ? 'is-empty' : ''}`}
                aria-label="Empresa"
                title={empresaTexto}
              >
                {empresaTexto}
              </div>}

              {/* Linha 3: Telefone e Alinhamento à direita dos botões Salvar e Cancelar */}
              <input
                type="tel"
                name="tel"
                maxLength={20}
                value={form.tel}
                onChange={handleChange}
                placeholder="Telefone"
                disabled={salvando}
              />

              <div className="profile-actions">
                <button
                  type="submit"
                  className="btn-save"
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>


              </div>
            </div>
          </form>
        </div>
      </section>
      <section className="panel profile-avaliacoes profile-avaliacoes-compacto">
        <div>
          <h2>{suporte ? 'Minhas avaliações' : 'Avaliações dos atendimentos'}</h2>
          {suporte ? <p aria-live="polite">{erroAvaliacoes || (!avaliacoes ? 'Carregando avaliações...' : avaliacoes.quantidade > 0
            ? <><strong className="profile-nota">★ {Number(avaliacoes.media).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} <small>/ 5</small></strong><span> · {avaliacoes.quantidade} {avaliacoes.quantidade === 1 ? 'avaliação recebida' : 'avaliações recebidas'}</span></>
            : 'Você ainda não recebeu avaliações.')}</p>
            : <p>Avalie seus atendimentos resolvidos de 1 a 5 estrelas.</p>}
        </div>
        <Link className="secondary-button" to="/historico">Ver avaliações</Link>
      </section>
    </>
  );
}
