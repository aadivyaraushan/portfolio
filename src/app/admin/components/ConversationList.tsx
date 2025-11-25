import { Emoji } from 'react-apple-emojis';

import { normalizeEmojiName } from '../emoji';
import { Conversation } from '../types';
import { formatAgo } from '../../../lib/conversationStore';

type ConversationListProps = {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyMessage?: string | null;
};

type ConversationListItemProps = {
  conversation: Conversation;
  selected: boolean;
  onSelect: (id: string) => void;
};

function ConversationListItem({ conversation, selected, onSelect }: ConversationListItemProps) {
  return (
    <button
      type="button"
      className={`admin-send ${selected ? 'admin-send--active' : ''}`}
      style={{ justifyContent: 'space-between', width: '100%' }}
      onClick={() => onSelect(conversation.id)}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {conversation.icon ? <Emoji name={normalizeEmojiName(conversation.icon)} width={18} height={18} /> : null}
        <span>{conversation.title}</span>
      </span>
      <span style={{ fontSize: '11px', opacity: 0.8 }}>
        {conversation.pinned ? 'pinned' : formatAgo(conversation.messages.at(-1)?.time ?? new Date())}
      </span>
    </button>
  );
}

function ConversationList({ conversations, selectedId, onSelect, emptyMessage }: ConversationListProps) {
  if (!conversations.length) {
    return (
      <div style={{ padding: '8px', color: '#888' }}>
        {emptyMessage ?? 'no threads found'}
      </div>
    );
  }

  return (
    <>
      {conversations.map((conv) => (
        <ConversationListItem
          key={conv.id}
          conversation={conv}
          selected={selectedId === conv.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export default ConversationList;
