import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { io } from 'socket.io-client';
import { apiFetch, SOCKET_URL } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import type { ConversationListItem, ConversationStatus, User } from '../types';

export function ConversationsPage() {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConversationStatus | 'all'>('all');
  const [assignedUserId, setAssignedUserId] = useState('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (assignedUserId !== 'all') params.set('assigned_user_id', assignedUserId);
    const data = await apiFetch<ConversationListItem[]>(`/conversations?${params.toString()}`);
    setItems(data);
  }

  useEffect(() => {
    Promise.all([load(), apiFetch<User[]>('/users').then(setUsers).catch(() => undefined)]).finally(() => setLoading(false));
  }, [status, assignedUserId]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('message:received', load);
    socket.on('message:sent', load);
    socket.on('conversation:updated', load);
    return () => {
      socket.disconnect();
    };
  }, [status, assignedUserId]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return items.filter((item) =>
      [item.contact_name, item.phone, item.last_message_body, item.assigned_user_name].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [items, search]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Conversas</h1>
          <p>Fila compartilhada para todos os computadores autorizados.</p>
        </div>
        <label className="search">
          <Search size={18} aria-hidden />
          <input placeholder="Buscar por nome, telefone ou mensagem" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </header>

      <div className="filters">
        <select value={status} onChange={(event) => setStatus(event.target.value as ConversationStatus | 'all')}>
          <option value="all">Todos os status</option>
          <option value="new">Novo</option>
          <option value="in_progress">Em atendimento</option>
          <option value="closed">Resolvido</option>
        </select>
        <select value={assignedUserId} onChange={(event) => setAssignedUserId(event.target.value)}>
          <option value="all">Todos os atendentes</option>
          {users.map((user) => (
            <option value={user.id} key={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className="conversation-list">
        {loading && <div className="empty">Carregando conversas...</div>}
        {!loading && filtered.length === 0 && <div className="empty">Nenhuma conversa encontrada.</div>}
        {filtered.map((item) => (
          <Link className="conversation-row" to={`/conversas/${item.id}`} key={item.id}>
            <div>
              <strong>{item.contact_name || item.phone}</strong>
              <span>{item.phone}</span>
            </div>
            <p>{item.last_message_body || 'Sem mensagens registradas.'}</p>
            <div className="row-meta">
              <span>{item.assigned_user_name || 'Sem atendente'}</span>
              <StatusBadge status={item.status} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
