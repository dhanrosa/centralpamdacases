import type { ConversationStatus } from '../types';

const labels: Record<ConversationStatus, string> = {
  new: 'Novo',
  in_progress: 'Em atendimento',
  closed: 'Resolvido'
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}
