import { track } from '@vercel/analytics/react';

type NewConversationCardProps = {
  newTitle: string;
  newPreview: string;
  newPinned: boolean;
  newSeed: string;
  newIcon: string;
  onTitleChange: (value: string) => void;
  onPreviewChange: (value: string) => void;
  onPinnedChange: (value: boolean) => void;
  onSeedChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onCreate: () => void;
};

function NewConversationCard({
  newTitle,
  newPreview,
  newPinned,
  newSeed,
  newIcon,
  onTitleChange,
  onPreviewChange,
  onPinnedChange,
  onSeedChange,
  onIconChange,
  onCreate,
}: NewConversationCardProps) {
  return (
    <div className="admin-card" style={{ marginBottom: '12px' }}>
      <div className="admin-card-header" style={{ justifyContent: 'flex-start', gap: '10px' }}>
        <span className="admin-name">add a new conversation</span>
        <label className="admin-pill" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={newPinned}
            onChange={(e) => onPinnedChange(e.target.checked)}
          />
          pinned
        </label>
      </div>
      <input
        className="admin-textarea"
        style={{ minHeight: 'auto', height: '38px' }}
        placeholder="title (e.g., quick links)"
        value={newTitle}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <input
        className="admin-textarea"
        style={{ minHeight: 'auto', height: '38px' }}
        placeholder="preview (e.g., resume, email, socials)"
        value={newPreview}
        onChange={(e) => onPreviewChange(e.target.value)}
      />
      <input
        className="admin-textarea"
        style={{ minHeight: 'auto', height: '38px' }}
        placeholder="emoji unicode name (e.g., rocket, red heart)"
        value={newIcon}
        onChange={(e) => onIconChange(e.target.value)}
      />
      <textarea
        className="admin-textarea"
        placeholder="optional seed message to start the thread..."
        value={newSeed}
        onChange={(e) => onSeedChange(e.target.value)}
      />
      <button
        className="admin-send"
        type="button"
        onClick={() => {
          track('admin_conversation_create', {
            title: newTitle,
            pinned: newPinned,
            hasSeed: Boolean(newSeed.trim()),
            hasIcon: Boolean(newIcon.trim()),
          });
          onCreate();
        }}
        disabled={!newTitle.trim() || !newPreview.trim()}
      >
        create conversation
      </button>
    </div>
  );
}

export default NewConversationCard;
