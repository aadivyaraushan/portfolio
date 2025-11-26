type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
};

function MessageComposer({
  value,
  onChange,
  onSubmit,
  onFileSelect,
  selectedFile,
  disabled = false,
}: MessageComposerProps) {
  return (
    <div className="admin-composer">
      <textarea
        className="admin-textarea"
        placeholder="type a new message to append..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="admin-composer-controls">
        <input
          type="file"
          id="file-upload"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            onFileSelect(file);
          }}
        />
        <label htmlFor="file-upload" className="admin-upload-btn">
          {selectedFile ? selectedFile.name : 'attach file'}
        </label>
        {selectedFile && (
          <button
            type="button"
            className="admin-clear-file"
            onClick={() => onFileSelect(null)}
          >
            ×
          </button>
        )}
        <button
          className="admin-send"
          type="button"
          onClick={onSubmit}
          disabled={disabled && !selectedFile}
        >
          add message
        </button>
      </div>
    </div>
  );
}

export default MessageComposer;
