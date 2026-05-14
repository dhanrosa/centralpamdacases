import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiFetch } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import type { ConversationListItem } from '../types';

export function ConversationsPage() {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ConversationListItem[]>('/conversations')
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return items.filter((item) =>
      [item.contact_name, item.phone_number, item.last_message_body].some((value) => value?.toLowerCase().includes(term))
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

      <div className="conversation-list">
        {loading && <div className="empty">Carregando conversas...</div>}
        {!loading && filtered.length === 0 && <div className="empty">Nenhuma conversa encontrada.</div>}
        {filtered.map((item) => (
          <Link className="conversation-row" to={`/conversas/${item.id}`} key={item.id}>
            <div>
              <strong>{item.contact_name || item.phone_number}</strong>
              <span>{item.phone_number}</span>
            </div>
            <p>{item.last_message_body || 'Sem mensagens registradas.'}</p>
            <StatusBadge status={item.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}

