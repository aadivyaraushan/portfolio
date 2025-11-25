type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

function MessageComposer({ value, onChange, onSubmit, disabled = false }: MessageComposerProps) {
  return (
    <>
      <textarea
        className="admin-textarea"
        placeholder="type a new message to append..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="admin-send"
        type="button"
        onClick={onSubmit}
        disabled={disabled}
      >
        add message
      </button>
    </>
  );
}

export default MessageComposer;
