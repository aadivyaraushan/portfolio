import { Message } from '../types';
import { formatAgo } from '../../../lib/conversationStore';

type MessageListProps = {
  messages: Message[];
  messageEdits: Record<string, string>;
  onChange: (messageId: string, value: string) => void;
  onSave: (messageId: string) => void;
  onDelete: (messageId: string) => void;
};

type MessageRowProps = {
  message: Message;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
};

function MessageRow({ message, value, onChange, onSave, onDelete }: MessageRowProps) {
  return (
    <div className="admin-msg-row">
      <div style={{ flex: '1 1 auto' }}>
        <textarea
          className="admin-textarea"
          style={{ minHeight: '60px' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="admin-msg-meta">{formatAgo(message.time)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          type="button"
          className="admin-send"
          onClick={onSave}
          disabled={!value.trim()}
        >
          save
        </button>
        <button
          type="button"
          className="admin-delete"
          onClick={onDelete}
          aria-label="delete message"
        >
          delete
        </button>
      </div>
    </div>
  );
}

function MessageList({ messages, messageEdits, onChange, onSave, onDelete }: MessageListProps) {
  return (
    <div className="admin-messages">
      {messages.slice().reverse().map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          value={messageEdits[message.id] ?? message.text}
          onChange={(val) => onChange(message.id, val)}
          onSave={() => onSave(message.id)}
          onDelete={() => onDelete(message.id)}
        />
      ))}
    </div>
  );
}

export default MessageList;
