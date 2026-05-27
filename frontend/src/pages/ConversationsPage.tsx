import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Plus, Search, Send, X } from 'lucide-react';
import { apiFetch } from '../api';
import { supabase } from '../supabase';
import type { SimpleConversa, SimpleMensagem } from '../types';

type SelectedConversation =
  | { kind: 'existing'; conversa: SimpleConversa }
  | { kind: 'new'; phone: string };

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function ConversationsPage() {
  const [conversas, setConversas] = useState<SimpleConversa[]>([]);
  const [mensagens, setMensagens] = useState<SimpleMensagem[]>([]);
  const [selected, setSelected] = useState<SelectedConversation | null>(null);
  const [search, setSearch] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedConversa = selected?.kind === 'existing' ? selected.conversa : null;
  const selectedPhone = selected?.kind === 'new' ? selected.phone : selectedConversa?.phone ?? '';

  async function loadConversas() {
    if (!supabase) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no frontend.');
      setLoading(false);
      return;
    }

    const { data, error: requestError } = await supabase
      .from('conversas')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }

    setConversas((data ?? []) as SimpleConversa[]);
    setLoading(false);
  }

  async function loadMensagens(conversaId: string) {
    if (!supabase) return;

    const { data, error: requestError } = await supabase
      .from('mensagens')
      .select('id, conversa_id, phone, direction, type, body, meta_message_id, status, created_at')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: true });

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setMensagens((data ?? []) as SimpleMensagem[]);
  }

  useEffect(() => {
    loadConversas();
  }, []);

  useEffect(() => {
    if (!selectedConversa) {
      setMensagens([]);
      return;
    }

    loadMensagens(selectedConversa.id);
  }, [selectedConversa?.id]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('painel-whatsapp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas' }, () => {
        loadConversas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, (payload) => {
        const row = payload.new as SimpleMensagem | null;
        if (row?.conversa_id && row.conversa_id === selectedConversa?.id) {
          loadMensagens(row.conversa_id);
        }
        loadConversas();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [selectedConversa?.id]);

  useEffect(() => {
    if (selected?.kind !== 'new') return;
    const created = conversas.find((item) => item.phone === selected.phone);
    if (created) {
      setSelected({ kind: 'existing', conversa: created });
    }
  }, [conversas, selected]);

  const filteredConversas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversas;

    return conversas.filter((item) =>
      [item.name, item.phone, item.last_message].some((value) => value?.toLowerCase().includes(term))
    );
  }, [conversas, search]);

  function startConversation(event: FormEvent) {
    event.preventDefault();
    const phone = normalizePhone(newPhone);
    if (phone.length < 10) {
      setError('Informe o telefone com DDI e DDD. Ex: 5541999999999.');
      return;
    }

    const existing = conversas.find((item) => item.phone === phone);
    setSelected(existing ? { kind: 'existing', conversa: existing } : { kind: 'new', phone });
    setNewPhone('');
    setShowNew(false);
    setError('');
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const phone = normalizePhone(selectedPhone);
    const messageText = text.trim();
    if (!phone || !messageText) return;

    setSending(true);
    setError('');
    try {
      const response = await apiFetch<{ conversa: SimpleConversa }>('/send-message', {
        method: 'POST',
        body: JSON.stringify({ phone, text: messageText })
      });
      setText('');
      setSelected({ kind: 'existing', conversa: response.conversa });
      await Promise.all([loadConversas(), loadMensagens(response.conversa.id)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="inbox">
      <aside className="inbox-sidebar">
        <header className="inbox-topbar">
          <div>
            <h1>Conversas</h1>
            <span>Painel interno</span>
          </div>
          <button className="icon-button primary" onClick={() => setShowNew(true)} aria-label="Nova conversa" title="Nova conversa">
            <Plus size={20} />
          </button>
        </header>

        <label className="search compact">
          <Search size={18} aria-hidden />
          <input placeholder="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        {showNew && (
          <form className="new-chat-form" onSubmit={startConversation}>
            <input
              autoFocus
              placeholder="5541999999999"
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
            />
            <button className="icon-button primary" aria-label="Iniciar conversa" title="Iniciar conversa">
              <Plus size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowNew(false)}
              aria-label="Cancelar"
              title="Cancelar"
            >
              <X size={18} />
            </button>
          </form>
        )}

        <div className="inbox-list">
          {loading && <div className="empty quiet">Carregando...</div>}
          {!loading && filteredConversas.length === 0 && <div className="empty quiet">Nenhuma conversa.</div>}
          {filteredConversas.map((item) => (
            <button
              className={`inbox-row ${selectedConversa?.id === item.id ? 'active' : ''}`}
              onClick={() => setSelected({ kind: 'existing', conversa: item })}
              key={item.id}
            >
              <div>
                <strong>{item.name || item.phone}</strong>
                <span>{formatDate(item.last_message_at || item.created_at)}</span>
              </div>
              <p>{item.last_message || item.phone}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className="inbox-chat">
        {error && <div className="alert">{error}</div>}

        {!selected && (
          <div className="chat-placeholder">
            <MessageCircle size={34} aria-hidden />
            <h2>Selecione uma conversa</h2>
          </div>
        )}

        {selected && (
          <>
            <header className="chat-header simple">
              <div>
                <h1>{selectedConversa?.name || selectedPhone}</h1>
                <p>{selectedPhone}</p>
              </div>
            </header>

            <div className="messages simple">
              {selected.kind === 'new' && <div className="empty quiet">Conversa nova. Envie a primeira mensagem.</div>}
              {mensagens.map((item) => (
                <article className={`message ${item.direction}`} key={item.id}>
                  <p>{item.body || `[${item.type}]`}</p>
                  <span>
                    {formatDate(item.created_at)} {item.status ? `- ${item.status}` : ''}
                  </span>
                </article>
              ))}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <input
                placeholder="Digite uma mensagem"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={4096}
              />
              <button className="icon-button primary" disabled={sending || !text.trim()} aria-label="Enviar" title="Enviar">
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </main>
    </section>
  );
}
