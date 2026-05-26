import { FormEvent, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const { login, token } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/conversas" replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-mark">
          <MessageCircle size={28} aria-hidden />
        </div>
        <div>
          <h1>Central WhatsApp</h1>
          <p>Acesso interno para atendentes identificados.</p>
        </div>
        {error && <div className="alert">{error}</div>}
        <label>
          Usuario
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button className="primary-button" disabled={loading}>
          Entrar
        </button>
      </form>
    </main>
  );
}
