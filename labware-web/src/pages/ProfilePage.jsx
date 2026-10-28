
import { useState } from 'react';
// import { UserRound } from 'lucide-react';
import { getCurrentUser } from '../data/mockDatabase';

export default function ProfilePage() {
  const user = getCurrentUser();

  const initialData = {
    name: user.name || '',
    email: user.email || '',
    cargo: user.cargo || '',
    tel: user.tel ||'',
  };

  const [form, setForm] = useState(initialData);
  const [savedData, setSavedData] = useState(initialData);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSavedData({ ...form });
    alert('Alterações salvas com sucesso!');
  };

  const handleCancel = () => {
    setForm({ ...savedData });
  };

  const initials = form.name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Central de Suporte</div>
          <h1>Perfil</h1>
        </div>
      </div>

      <section className="panel profile-panel">
        <span className="avatar avatar-large">
          {initials}
        </span>

        <div>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
            >
              Editar
            </button>
          <h2>{form.name}</h2>
          <p>{form.email}</p>
        </div>
     
        <h2>Informações</h2>

        <form onSubmit={handleSave}>
          <div className="profile-info">
          
             
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nome Completo"
              />
   
          
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
              />
          

          
              <input
                name="cargo"
                value={form.cargo}
                onChange={handleChange}
                placeholder="Cargo"
              />
        

        
              <input
                type="tel"
                name="tel"
                value={form.tel}
                onChange={handleChange}
                placeholder="Telefone"
              />
           
          </div>

          <div className="profile-actions">
            <button type="submit" className="btn-save">
              Salvar
            </button>

            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
