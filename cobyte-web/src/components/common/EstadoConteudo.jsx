import '../../css/EstadoConteudo.css';

export default function EstadoConteudo({ tipo = 'vazio', mensagem, onTentar }) {
  return <div className={'estado-conteudo estado-conteudo--' + tipo} role={tipo === 'erro' ? 'alert' : 'status'} aria-live="polite">
    <p>{mensagem || (tipo === 'carregando' ? 'Carregando...' : 'Nenhum resultado encontrado.')}</p>
    {onTentar && <button type="button" className="secondary-button" onClick={onTentar}>Tentar novamente</button>}
  </div>;
}
