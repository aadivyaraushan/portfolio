import { Emoji } from 'react-apple-emojis';

import { normalizeEmojiName } from '../emoji';
import { Conversation } from '../types';
import { formatAgo } from '../../../lib/conversationStore';

type ConversationHeaderProps = {
  conversation: Conversation;
  pinned: boolean;
  onPinnedChange: (next: boolean) => void;
  onDelete: () => void;
};

function ConversationHeader({ conversation, pinned, onPinnedChange, onDelete }: ConversationHeaderProps) {
  return (
    <div className="admin-card-header">
      <span className="admin-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {conversation.icon ? <Emoji name={normalizeEmojiName(conversation.icon)} width={20} height={20} /> : null}
        {conversation.title}
      </span>
      <label className="admin-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => onPinnedChange(e.target.checked)}
        />
        pinned
      </label>
      <span className="admin-pill muted">
        last: {formatAgo(conversation.messages.at(-1)?.time ?? new Date())}
      </span>
      <button
        type="button"
        className="admin-delete"
        onClick={onDelete}
        style={{ marginLeft: 'auto' }}
      >
        delete thread
      </button>
    </div>
  );
}

export default ConversationHeader;
