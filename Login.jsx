import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Lock, User, Building } from 'lucide-react';

export default function Login() {
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);

  // Monitora o bloqueio por tentativas
  useEffect(() => {
    if (tentativas >= 3) {
      setBloqueado(true);
      setError('Conta temporariamente bloqueada devido a 3 tentativas incorretas.');
    }
  }, [tentativas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bloqueado) return;

    setError('');

    try {
      // Aqui você fará a chamada para a sua API SQLite
      // Proteção contra SQL Injection ocorre tratando os dados na API (usando Prepared Statements)
      const response = await fetch('https://seusistema.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa, email, senha })
      });

      const data = await response.json();

      if (!response.ok) {
        setTentativas(prev => prev + 1);
        throw new Error(data.message || 'Credenciais inválidas.');
      }

      // Armazena o Token de Acesso com segurança
      localStorage.setItem('@Sistema:token', data.token);
      localStorage.setItem('@Sistema:user', JSON.stringify(data.user));

      // Regra: Primeiro acesso força a troca de senha
      if (data.user.primeiroAcesso) {
        window.location.href = '/reset-password';
      } else {
        window.location.href = '/dashboard';
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto w-full sm:max-w-md px-4">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl md:text-3xl font-extrabold text-slate-900">
          Login Universal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Acesse o banco de dados da sua empresa
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Seleção/Nome da Empresa */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Empresa</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  disabled={bloqueado}
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="Nome ou ID da Empresa"
                />
              </div>
            </div>

            {/* Email (Username) */}
            <div>
              <label className="block text-sm font-medium text-slate-700">E-mail</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  disabled={bloqueado}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Senha</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showSenha ? "text" : "password"}
                  required
                  disabled={bloqueado}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={bloqueado}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${bloqueado ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''}`}
              >
                Entrar no Sistema
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
