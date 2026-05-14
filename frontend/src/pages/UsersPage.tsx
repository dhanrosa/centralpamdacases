import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../api';
import type { Role, User } from '../types';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' as Role });
  const [error, setError] = useState('');

  async function load() {
    const data = await apiFetch<User[]>('/users');
    setUsers(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ ...form, active: true })
      });
      setForm({ name: '', email: '', password: '', role: 'agent' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Atendentes</h1>
          <p>Usuários com acesso ao painel por login e senha.</p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <form className="user-form" onSubmit={createUser}>
        <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input
          placeholder="E-mail"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          placeholder="Senha inicial"
          type="password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          <option value="agent">Atendente</option>
          <option value="supervisor">Supervisor</option>
          <option value="admin">Administrador</option>
        </select>
        <button className="primary-button">Criar</button>
      </form>

      <div className="table">
        {users.map((user) => (
          <div className="table-row" key={user.id}>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span>{user.role}</span>
            <span>{user.active ? 'Ativo' : 'Inativo'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

