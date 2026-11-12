import { Pencil } from 'lucide-react';
import AvatarUsuario from './AvatarUsuario';
import { useEffect, useRef, useState } from 'react';
export default function EditorFoto({ onPreparar, user }) {
  const canvas = useRef(null);
  const arraste = useRef(null);
  const arquivoInput = useRef(null);
  const [previa, setPrevia] = useState(null);
  const [imagem, setImagem] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [erro, setErro] = useState('');
  const sequencia = useRef(0);
  useEffect(() => {
    if (!imagem) return;
    const escala = 256 / Math.min(imagem.width, imagem.height) * zoom;
    const contexto = canvas.current.getContext('2d');
    contexto.clearRect(0, 0, 256, 256);
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, 256, 256);
    contexto.drawImage(imagem, (256 - imagem.width * escala) / 2 + x, (256 - imagem.height * escala) / 2 + y, imagem.width * escala, imagem.height * escala);
    setPrevia(canvas.current.toDataURL('image/png'));
    const atual = ++sequencia.current;
    canvas.current.toBlob(blob => { if (atual === sequencia.current && blob) onPreparar(blob); }, 'image/png');
  }, [imagem, zoom, x, y, onPreparar]);
  function iniciarArraste(evento) {
    if (evento.pointerType === 'mouse' && evento.button !== 0) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arraste.current = { id: evento.pointerId, px: evento.clientX, py: evento.clientY, x, y };
  }
  function moverFoto(evento) {
    const inicio = arraste.current;
    if (!inicio || inicio.id !== evento.pointerId || !imagem) return;
    const escala = 256 / evento.currentTarget.getBoundingClientRect().width;
    const limitar = valor => Math.max(-128, Math.min(128, valor));
    setX(limitar(inicio.x + (evento.clientX - inicio.px) * escala));
    setY(limitar(inicio.y + (evento.clientY - inicio.py) * escala));
  }
  function terminarArraste(evento) {
    if (arraste.current?.id === evento.pointerId) arraste.current = null;
  }
  function redefinir() { setZoom(1); setX(0); setY(0); }
  function moverTeclado(evento) {
    const passos = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] };
    if (!passos[evento.key]) return;
    evento.preventDefault();
    const [dx, dy] = passos[evento.key];
    setX(valor => Math.max(-128, Math.min(128, valor + dx)));
    setY(valor => Math.max(-128, Math.min(128, valor + dy)));
  }
  async function escolher(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(arquivo.type) || arquivo.size > 10 * 1024 * 1024) {
      setErro('Escolha uma foto JPG, PNG ou GIF de até 10 MB.'); return;
    }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width * img.height > 20000000) { setErro('A imagem deve ter até 20 megapixels.'); return; }
      setImagem(img); setZoom(1); setX(0); setY(0); setErro('');
    };
    img.onerror = () => { URL.revokeObjectURL(url); setErro('Não foi possível abrir esta imagem.'); };
    img.src = url;
  }
  return <div className="editor-foto">
    <input ref={arquivoInput} type="file" accept="image/jpeg,image/png,image/gif" onChange={escolher} hidden />
    <button type="button" className="avatar-editar" aria-label="Alterar foto" title="Alterar foto" onClick={() => arquivoInput.current?.click()}>
      {previa ? <img src={previa} alt="" /> : <AvatarUsuario user={user} grande />}
      <span className="avatar-editar-icone"><Pencil size={15} aria-hidden="true" /></span>
    </button>
    {erro && <p role="alert">{erro}</p>}
    {imagem && <div className="editor-foto-ajustes">
      <canvas ref={canvas} width="256" height="256" className="foto-arrastavel" tabIndex={0}
        aria-label="Arraste a foto para posicionar. Também é possível usar as setas do teclado."
        onPointerDown={iniciarArraste} onPointerMove={moverFoto} onPointerUp={terminarArraste}
        onPointerCancel={terminarArraste} onLostPointerCapture={terminarArraste} onKeyDown={moverTeclado} />
      <div><p>Arraste a foto para ajustar e clique em Salvar no perfil.</p>
        <label>Zoom<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
        <button type="button" className="secondary-button" onClick={redefinir}>Redefinir</button>
      </div>
    </div>}
  </div>;
}
