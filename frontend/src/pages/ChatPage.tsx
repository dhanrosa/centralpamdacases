import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Send, UserCheck } from 'lucide-react';
import { io } from 'socket.io-client';
import { apiFetch, SOCKET_URL } from '../api';
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

  useEffect(() => {
    const socket = io(SOCKET_URL);
    const reloadIfCurrent = (payload: { conversation_id?: string; id?: string }) => {
      if (payload.conversation_id === id || payload.id === id) {
        load();
      }
    };
    socket.on('message:received', reloadIfCurrent);
    socket.on('message:sent', reloadIfCurrent);
    socket.on('conversation:updated', reloadIfCurrent);
    return () => {
      socket.disconnect();
    };
  }, [id]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!id || !message.trim()) return;

    setSending(true);
    try {
      await apiFetch('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: id, body: message })
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
    await apiFetch(`/conversations/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    await load();
  }

  async function assignToMe() {
    if (!id) return;
    await apiFetch(`/conversations/${id}/assign`, { method: 'POST', body: JSON.stringify({}) });
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
            <h1>{detail.conversation.contact_name || detail.conversation.phone}</h1>
            <p>{detail.conversation.phone}</p>
          </div>
          <StatusBadge status={detail.conversation.status} />
        </header>

        <div className="messages">
          {detail.messages.map((item) => (
            <article className={`message ${item.direction}`} key={item.id}>
              <p>{item.body}</p>
              <span>
                {new Date(item.created_at).toLocaleString('pt-BR')} - {item.status}
                {item.sent_by_user_name ? ` - ${item.sent_by_user_name}` : ''}
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
            <button onClick={assignToMe}>
              <UserCheck size={16} aria-hidden />
              Assumir atendimento
            </button>
            <button onClick={() => setStatus('new')}>Novo</button>
            <button onClick={() => setStatus('in_progress')}>Em atendimento</button>
            <button onClick={() => setStatus('closed')}>
              <CheckCircle size={16} aria-hidden />
              Marcar resolvido
            </button>
          </div>
          <p className="assigned">Atendente: {detail.conversation.assigned_user_name || 'sem responsavel'}</p>
        </section>

        <section>
          <h2>Observacoes internas</h2>
          <form onSubmit={saveNote} className="note-form">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Adicionar observacao" />
            <button className="secondary-button">Salvar observacao</button>
          </form>
          <div className="notes">
            {detail.notes.map((item) => (
              <article key={item.id}>
                <p>{item.note}</p>
                <span>
                  {item.author_name || 'Sistema'} - {new Date(item.created_at).toLocaleString('pt-BR')}
                </span>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
