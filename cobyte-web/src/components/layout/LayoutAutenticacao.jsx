export default function LayoutAutenticacao({ children }) {
  return (
    <main className="tela-autenticacao">
      <div className="conteudo-autenticacao">
        <section className="identidade-marca" aria-label="CoByte">
          <div className="logo-marca-conteudo">
            <img className="logo-marca" src="/cobyte-logo-white.png" alt="CoByte" />
          </div>
          <div className="texto-apresentacao">
            <h1>Seu suporte,<span className="destaque-claro">mais próximo.</span><span className="destaque-azul">Tudo conectado.</span></h1>
            <p>Acompanhe suas solicitações, converse com a equipe e fique por dentro de cada atualização em um só lugar.</p>
          </div>
        </section>
        <section className="cartao-autenticacao-conteudo">{children}</section>
      </div>
    </main>
  );
}
