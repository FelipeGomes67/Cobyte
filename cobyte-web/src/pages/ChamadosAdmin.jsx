import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../services/api';
import { useTickets } from '../hooks/useTickets';
import { useEstadoUrl } from '../hooks/useEstadoUrl';
import EstadoConteudo from '../components/common/EstadoConteudo';
import ConfirmDialog from '../components/common/ConfirmDialog';
import TabelaChamados from '../components/ticket/TabelaChamados';
import '../css/ChamadosAdmin.css';

export default function ChamadosAdmin() {
  const [busca, setBusca] = useEstadoUrl('busca', '');
  const [tentativa, setTentativa] = useState(0);
  const { tickets, loading, error } = useTickets('pessoal', tentativa);
  const [excluidos, setExcluidos] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [aviso, setAviso] = useState('');
  const emCurso = useRef(false);
  async function excluir() {
    if (!selecionado || emCurso.current) return;
    emCurso.current = true;
    setExcluindo(true);
    setAviso('');
    try {
      const { data } = await api.delete('/chamados/' + selecionado.id);
      setAviso(Array.isArray(data?.avisos) && data.avisos.length
        ? data.avisos.join(' ')
        : 'Chamado ' + selecionado.protocolo + ' e seus registros vinculados foram excluídos.');
      setSelecionado(null);
      setExcluidos(ids => [...ids, selecionado.id]);
      window.dispatchEvent(new Event('cobyte-chamados-atualizados'));
    } catch (erro) {
      setSelecionado(null);
      setAviso(erro.response?.data?.detail || erro.response?.data?.message || 'Não foi possível excluir o chamado. Atualize a lista antes de tentar novamente.');
    } finally {
      emCurso.current = false;
      setExcluindo(false);
    }
  }
  return <div className="chamados-admin">
    <div className="page-heading">
      <div><div className="eyebrow">Central de Suporte</div><h1>Gerenciar chamados</h1>
        <p>Consulte os chamados e gerencie a exclusão definitiva dos registros.</p></div>
    </div>
    {aviso && <div className="chamados-admin-aviso" role="status">{aviso}</div>}
    {loading && <EstadoConteudo tipo="carregando" mensagem="Carregando chamados..." />}
    {error && <EstadoConteudo tipo="erro" mensagem={error} onTentar={() => setTentativa(v => v + 1)} />}
    {!loading && (!error || tickets.length > 0) && <TabelaChamados
      tickets={tickets.filter(c => !excluidos.includes(c.id))}
      query={busca} onSearch={setBusca} todosStatus vincularCodigo={false} tamanhoPagina={20}
      titulo="Chamados para gerenciamento"
      renderAcao={c => <button type="button" className="chamados-admin-excluir" disabled={excluindo}
        onClick={() => setSelecionado(c)} aria-label={'Excluir chamado ' + c.protocolo}>
        <Trash2 size={14} aria-hidden="true" /> Excluir
      </button>}
    />}
    <ConfirmDialog open={!!selecionado} title="Excluir chamado definitivamente?"
      message={'O chamado ' + (selecionado?.protocolo || '') + ' será apagado com mensagens, anexos, notificações, histórico, avaliação e triagem. Esta ação não pode ser desfeita.'}
      confirmLabel={excluindo ? 'Excluindo...' : 'Excluir definitivamente'} busy={excluindo} Icone={Trash2}
      onConfirm={excluir} onCancel={() => { if (!emCurso.current) setSelecionado(null); }} />
  </div>;
}
