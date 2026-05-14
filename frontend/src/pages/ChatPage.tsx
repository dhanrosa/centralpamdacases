import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { apiFetch } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import type { ConversationDetail, Message, Note } from '../types';

interface DetailResponse {
  conversation: ConversationDetail;
  messages: Message[];
  notes: Note[];
}

export function ChatPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    if (!id) return;
    const data = await apiFetch<DetailResponse>(`/conversations/${id}`);
    setDetail(data);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!id || !message.trim()) return;

    setSending(true);
    try {
      await apiFetch('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ conversationId: id, text: message })
      });
      setMessage('');
      await load();
    } finally {
      setSending(false);
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!id || !note.trim()) return;

    await apiFetch(`/conversations/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
    setNote('');
    await load();
  }

  async function setStatus(status: ConversationDetail['status']) {
    if (!id) return;
    await apiFetch(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    await load();
  }

  if (!detail) {
    return <div className="empty">Carregando conversa...</div>;
  }

  return (
    <section className="chat-layout">
      <div className="chat-main">
        <header className="chat-header">
          <div>
            <h1>{detail.conversation.contact_name || detail.conversation.phone_number}</h1>
            <p>{detail.conversation.phone_number}</p>
          </div>
          <StatusBadge status={detail.conversation.status} />
        </header>

        <div className="messages">
          {detail.messages.map((item) => (
            <article className={`message ${item.direction}`} key={item.id}>
              <p>{item.body}</p>
              <span>
                {new Date(item.created_at).toLocaleString('pt-BR')} · {item.status}
              </span>
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            placeholder="Digite uma mensagem de texto"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={4096}
          />
          <button className="icon-button primary" disabled={sending || !message.trim()} aria-label="Enviar" title="Enviar">
            <Send size={20} />
          </button>
        </form>
      </div>

      <aside className="chat-side">
        <section>
          <h2>Status</h2>
          <div className="segmented">
            <button onClick={() => setStatus('new')}>Novo</button>
            <button onClick={() => setStatus('in_progress')}>Em atendimento</button>
            <button onClick={() => setStatus('closed')}>Finalizado</button>
          </div>
        </section>

        <section>
          <h2>Observações internas</h2>
          <form onSubmit={saveNote} className="note-form">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Adicionar observação" />
            <button className="secondary-button">Salvar observação</button>
          </form>
          <div className="notes">
            {detail.notes.map((item) => (
              <article key={item.id}>
                <p>{item.note}</p>
                <span>
                  {item.author_name || 'Sistema'} · {new Date(item.created_at).toLocaleString('pt-BR')}
                </span>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

