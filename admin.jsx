import React, { useState } from 'react';

export default function CreateUser() {
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    celular: '',
    email: '',
    senhaProvisoria: '',
    modulos: []
  });
  const [message, setMessage] = useState('');

  const modulosDisponiveis = ['Financeiro', 'Estoque', 'Vendas', 'RH', 'Suporte'];

  // Validação da força da senha conforme sua regra
  const validarSenha = (senha) => {
    const regex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
    return regex.test(senha);
  };

  const handleCheckboxChange = (modulo) => {
    setFormData(prev => {
      const novosModulos = prev.modulos.includes(modulo)
        ? prev.modulos.filter(m => m !== modulo)
        : [...prev.modulos, modulo];
      return { ...prev, modulos: novosModulos };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarSenha(formData.senhaProvisoria)) {
      setMessage('Erro: A senha deve ter no mínimo 10 caracteres, incluir 1 letra maiúscula, 1 número e 1 caractere especial.');
      return;
    }

    try {
      const token = localStorage.getItem('@Sistema:token');
      const response = await fetch('https://seusistema.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Envio seguro do Token do Super Admin
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage('Usuário criado com sucesso! Senha provisória configurada.');
        // Limpar formulário...
      } else {
        const errData = await response.json();
        setMessage(`Erro: ${errData.message}`);
      }
    } catch (err) {
      setMessage('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow border border-slate-200 mt-10">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Criar Novo Usuário (Acesso Super Admin)</h2>
      
      {message && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome Completo</label>
          <input type="text" required className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5" 
            onChange={e => setFormData({...formData, nomeCompleto: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Celular</label>
            <input type="tel" required className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5" 
              onChange={e => setFormData({...formData, celular: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">E-mail (Será o Login)</label>
            <input type="email" required className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5" 
              onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Senha Provisória</label>
          <input type="text" required className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5" 
            onChange={e => setFormData({...formData, senhaProvisoria: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Permissões de Módulos</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {modulosDisponiveis.map(modulo => (
              <label key={modulo} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input type="checkbox" className="rounded text-blue-600" checked={formData.modulos.includes(modulo)} onChange={() => handleCheckboxChange(modulo)} />
                <span className="text-sm text-slate-700">{modulo}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Cadastrar Usuário
        </button>
      </form>
    </div>
  );
}
