export type ConversationStatus = 'aberto' | 'pendente' | 'finalizado';
export type MessageDirection = 'received' | 'sent';

export interface StoredMessage {
  id: string;
  direction: MessageDirection;
  text: string;
  time: string;
  status?: string;
}

export interface StoredConversation {
  id: string;
  waId: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  status: ConversationStatus;
  messages: StoredMessage[];
}

interface StoreState {
  conversations: StoredConversation[];
  receivedCount: number;
}

const globalStore = globalThis as typeof globalThis & { centralPamdaWhatsappStore?: StoreState };

const store =
  globalStore.centralPamdaWhatsappStore ??
  (globalStore.centralPamdaWhatsappStore = {
    conversations: [],
    receivedCount: 0
  });

function nowLabel() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}

function messageText(message: any) {
  if (message?.text?.body) return String(message.text.body);
  if (message?.button?.text) return String(message.button.text);
  if (message?.interactive?.button_reply?.title) return String(message.interactive.button_reply.title);
  if (message?.interactive?.list_reply?.title) return String(message.interactive.list_reply.title);
  return `[${message?.type ?? 'mensagem'}]`;
}

function upsertConversation(waId: string, name: string | null | undefined) {
  let conversation = store.conversations.find((item) => item.waId === waId);

  if (!conversation) {
    conversation = {
      id: waId,
      waId,
      name: name || waId,
      phone: waId,
      lastMessage: '',
      time: nowLabel(),
      status: 'aberto',
      messages: []
    };
    store.conversations.unshift(conversation);
  }

  if (name) {
    conversation.name = name;
  }

  return conversation;
}

export function ingestWhatsAppWebhook(payload: any) {
  const changes = payload?.entry?.flatMap((entry: any) => entry.changes ?? []) ?? [];

  for (const change of changes) {
    const value = change?.value;
    const contacts = value?.contacts ?? [];
    const messages = value?.messages ?? [];
    const statuses = value?.statuses ?? [];

    for (const status of statuses) {
      for (const conversation of store.conversations) {
        const message = conversation.messages.find((item) => item.id === status.id);
        if (message) {
          message.status = status.status;
        }
      }
    }

    for (const message of messages) {
      const waId = String(message.from ?? '');
      if (!waId) continue;

      const contact = contacts.find((item: any) => item.wa_id === waId);
      const conversation = upsertConversation(waId, contact?.profile?.name);
      const text = messageText(message);

      if (!conversation.messages.some((item) => item.id === message.id)) {
        conversation.messages.push({
          id: message.id ?? `${waId}-${Date.now()}`,
          direction: 'received',
          text,
          time: nowLabel(),
          status: 'received'
        });
        store.receivedCount += 1;
      }

      conversation.lastMessage = text;
      conversation.time = nowLabel();
      conversation.status = 'aberto';
      store.conversations = [conversation, ...store.conversations.filter((item) => item.id !== conversation.id)];
    }
  }
}

export function listConversations() {
  return store.conversations;
}

export function getConversation(id: string) {
  return store.conversations.find((item) => item.id === id);
}

export function addOutboundMessage(waId: string, text: string, providerId?: string) {
  const conversation = upsertConversation(waId, undefined);
  conversation.messages.push({
    id: providerId || `${waId}-out-${Date.now()}`,
    direction: 'sent',
    text,
    time: nowLabel(),
    status: 'sent'
  });
  conversation.lastMessage = text;
  conversation.time = nowLabel();
  conversation.status = 'pendente';
  store.conversations = [conversation, ...store.conversations.filter((item) => item.id !== conversation.id)];
  return conversation;
}

export function storeStats() {
  return {
    totalConversations: store.conversations.length,
    receivedMessages: store.receivedCount
  };
}
