import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import type { User } from '../types';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<User[]>('/users')
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Atendentes</h1>
          <p>Acessos fixos definidos no codigo do backend.</p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="table">
        {users.map((user) => (
          <div className="table-row" key={user.id}>
            <strong>{user.name}</strong>
            <span>{user.username}</span>
            <span>{user.role}</span>
            <span>{user.active ? 'Ativo' : 'Inativo'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
