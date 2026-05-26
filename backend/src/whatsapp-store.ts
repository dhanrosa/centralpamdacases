import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export type ConversationStatus = 'aberto' | 'pendente' | 'finalizado';
export type MessageDirection = 'inbound' | 'outbound';

export interface StoredMessage {
  id: string;
  conversationId: string;
  waMessageId: string;
  direction: MessageDirection;
  type: string;
  body: string;
  status: string;
  timestamp: string;
  rawPayload?: unknown;
  error?: string;
}

export interface StoredConversation {
  id: string;
  contactName: string;
  phone: string;
  wa_id: string;
  status: ConversationStatus;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

interface StoreState {
  conversations: StoredConversation[];
  messages: StoredMessage[];
  receivedCount: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageFile = process.env.VERCEL
  ? '/tmp/central-pamda-whatsapp-store.json'
  : path.resolve(__dirname, '../../data/whatsapp-store.json');

const globalStore = globalThis as typeof globalThis & { centralPamdaWhatsappStore?: StoreState };

function emptyStore(): StoreState {
  return { conversations: [], messages: [], receivedCount: 0 };
}

function loadStore(): StoreState {
  if (globalStore.centralPamdaWhatsappStore) {
    return globalStore.centralPamdaWhatsappStore;
  }

  try {
    if (fs.existsSync(storageFile)) {
      const data = JSON.parse(fs.readFileSync(storageFile, 'utf8')) as StoreState;
      globalStore.centralPamdaWhatsappStore = {
        conversations: data.conversations ?? [],
        messages: data.messages ?? [],
        receivedCount: data.receivedCount ?? 0
      };
      return globalStore.centralPamdaWhatsappStore;
    }
  } catch (error) {
    console.error('Falha ao carregar store WhatsApp', error);
  }

  globalStore.centralPamdaWhatsappStore = emptyStore();
  return globalStore.centralPamdaWhatsappStore;
}

const store = loadStore();

function persistStore() {
  try {
    fs.mkdirSync(path.dirname(storageFile), { recursive: true });
    fs.writeFileSync(storageFile, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Falha ao persistir store WhatsApp', error);
  }
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function displayTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function isoFromMetaTimestamp(timestamp: string | number | undefined) {
  const date = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString();
}

function messageText(message: any) {
  if (message?.text?.body) return String(message.text.body);
  if (message?.button?.text) return String(message.button.text);
  if (message?.interactive?.button_reply?.title) return String(message.interactive.button_reply.title);
  if (message?.interactive?.list_reply?.title) return String(message.interactive.list_reply.title);
  return `[${message?.type ?? 'mensagem'}]`;
}

function touchConversation(conversation: StoredConversation, lastMessage: string, timestamp: string) {
  conversation.lastMessage = lastMessage;
  conversation.lastMessageAt = timestamp;
  conversation.updatedAt = new Date().toISOString();
  store.conversations = [conversation, ...store.conversations.filter((item) => item.id !== conversation.id)];
}

function upsertConversation(params: { waId: string; name?: string; lastMessage?: string; timestamp?: string }) {
  const phone = normalizePhone(params.waId);
  const now = new Date().toISOString();
  let conversation = store.conversations.find((item) => item.wa_id === phone || item.phone === phone);

  if (!conversation) {
    conversation = {
      id: phone,
      contactName: params.name || phone,
      phone,
      wa_id: phone,
      status: 'aberto',
      lastMessage: params.lastMessage ?? '',
      lastMessageAt: params.timestamp ?? now,
      createdAt: now,
      updatedAt: now
    };
    store.conversations.unshift(conversation);
  }

  if (params.name) conversation.contactName = params.name;
  if (params.lastMessage) touchConversation(conversation, params.lastMessage, params.timestamp ?? now);
  return conversation;
}

export function createConversation(phone: string, name?: string) {
  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone.length < 12) {
    throw new Error('Telefone invalido. Informe DDI, DDD e numero. Ex: 5541999999999.');
  }

  const conversation = upsertConversation({
    waId: normalizedPhone,
    name: name || normalizedPhone,
    lastMessage: 'Conversa iniciada no painel',
    timestamp: new Date().toISOString()
  });
  conversation.status = 'pendente';
  persistStore();
  return conversation;
}

export function ingestWhatsAppWebhook(payload: any) {
  const changes = payload?.entry?.flatMap((entry: any) => entry.changes ?? []) ?? [];
  let foundMessages = 0;

  for (const change of changes) {
    const value = change?.value;
    const contacts = value?.contacts ?? [];
    const messages = value?.messages ?? [];
    const statuses = value?.statuses ?? [];

    for (const status of statuses) {
      const storedMessage = store.messages.find((item) => item.waMessageId === status.id);
      if (storedMessage) {
        storedMessage.status = status.status;
      }
    }

    for (const message of messages) {
      const waId = normalizePhone(String(message.from ?? ''));
      if (!waId) continue;
      foundMessages += 1;

      const contact = contacts.find((item: any) => item.wa_id === waId);
      const contactName = contact?.profile?.name || waId;
      const text = messageText(message);
      const timestamp = isoFromMetaTimestamp(message.timestamp);
      const waMessageId = String(message.id ?? `${waId}-${Date.now()}`);
      const conversation = upsertConversation({ waId, name: contactName, lastMessage: text, timestamp });

      if (!store.messages.some((item) => item.waMessageId === waMessageId)) {
        store.messages.push({
          id: waMessageId,
          conversationId: conversation.id,
          waMessageId,
          direction: 'inbound',
          type: String(message.type ?? 'text'),
          body: text,
          status: 'received',
          timestamp,
          rawPayload: message
        });
        store.receivedCount += 1;
      }

      conversation.status = 'aberto';
    }
  }

  persistStore();
  return { foundMessages };
}

export function listConversations(since?: string) {
  const sinceTime = since ? new Date(since).getTime() : 0;
  return store.conversations
    .filter((item) => !since || new Date(item.updatedAt).getTime() > sinceTime)
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .map((item) => ({ ...item, time: displayTime(item.lastMessageAt) }));
}

export function getConversation(id: string) {
  return store.conversations.find((item) => item.id === id);
}

export function listMessages(conversationId: string, since?: string) {
  const sinceTime = since ? new Date(since).getTime() : 0;
  return store.messages
    .filter((item) => item.conversationId === conversationId)
    .filter((item) => !since || new Date(item.timestamp).getTime() > sinceTime)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((item) => ({ ...item, time: displayTime(item.timestamp) }));
}

export function addOutboundMessage(waId: string, text: string, status = 'sending', providerId?: string) {
  const normalizedPhone = normalizePhone(waId);
  const timestamp = new Date().toISOString();
  const conversation = upsertConversation({ waId: normalizedPhone, lastMessage: text, timestamp });
  const localId = `local-${normalizedPhone}-${Date.now()}`;
  const message: StoredMessage = {
    id: localId,
    conversationId: conversation.id,
    waMessageId: providerId || localId,
    direction: 'outbound',
    type: 'text',
    body: text,
    status,
    timestamp
  };
  store.messages.push(message);
  conversation.status = status === 'failed' ? 'pendente' : 'aberto';
  persistStore();
  return message;
}

export function updateOutboundMessage(id: string, updates: { providerId?: string; status: string; error?: string; rawPayload?: unknown }) {
  const message = store.messages.find((item) => item.id === id);
  if (!message) return undefined;
  message.status = updates.status;
  if (updates.providerId) message.waMessageId = updates.providerId;
  if (updates.error) message.error = updates.error;
  if (updates.rawPayload) message.rawPayload = updates.rawPayload;
  persistStore();
  return message;
}

export function storeStats() {
  return {
    totalConversations: store.conversations.length,
    receivedMessages: store.receivedCount
  };
}
