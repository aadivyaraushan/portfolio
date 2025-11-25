import ConversationHeader from './ConversationHeader';
import ConversationMetaForm from './ConversationMetaForm';
import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import { Conversation } from '../types';

type ConversationDetailPanelProps = {
  conversation: Conversation;
  titleValue: string;
  previewValue: string;
  iconValue: string;
  pinnedValue: boolean;
  draftValue: string;
  messageEdits: Record<string, string>;
  saveDisabled: boolean;
  onTitleChange: (value: string) => void;
  onPreviewChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onPinnedChange: (value: boolean) => void;
  onSaveMeta: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onDeleteConversation: () => void;
  onMessageChange: (messageId: string, value: string) => void;
  onMessageSave: (messageId: string) => void;
  onMessageDelete: (messageId: string) => void;
};

function ConversationDetailPanel({
  conversation,
  titleValue,
  previewValue,
  iconValue,
  pinnedValue,
  draftValue,
  messageEdits,
  saveDisabled,
  onTitleChange,
  onPreviewChange,
  onIconChange,
  onPinnedChange,
  onSaveMeta,
  onDraftChange,
  onSend,
  onDeleteConversation,
  onMessageChange,
  onMessageSave,
  onMessageDelete,
}: ConversationDetailPanelProps) {
  return (
    <div className="admin-card" style={{ gridColumn: 'span 2' }}>
      <ConversationHeader
        conversation={conversation}
        pinned={pinnedValue}
        onPinnedChange={onPinnedChange}
        onDelete={onDeleteConversation}
      />

      <ConversationMetaForm
        titleValue={titleValue}
        previewValue={previewValue}
        iconValue={iconValue}
        onTitleChange={onTitleChange}
        onPreviewChange={onPreviewChange}
        onIconChange={onIconChange}
        onSave={onSaveMeta}
        saveDisabled={saveDisabled}
      />

      <MessageComposer
        value={draftValue}
        onChange={onDraftChange}
        onSubmit={onSend}
        disabled={!draftValue.trim()}
      />

      <MessageList
        messages={conversation.messages}
        messageEdits={messageEdits}
        onChange={onMessageChange}
        onSave={onMessageSave}
        onDelete={onMessageDelete}
      />
    </div>
  );
}

export default ConversationDetailPanel;
