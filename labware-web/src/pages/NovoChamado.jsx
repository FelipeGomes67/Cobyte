import FormularioNovoChamado from "../components/ticket/FormularioNovoChamado";

export default function NovoChamado() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <FormularioNovoChamado modoInicial="texto" />
    </div>
  );
}
