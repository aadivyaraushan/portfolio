type ConversationMetaFormProps = {
  titleValue: string;
  previewValue: string;
  iconValue: string;
  indexValue: number;
  onTitleChange: (value: string) => void;
  onPreviewChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onIndexChange: (value: number) => void;
  onSave: () => void;
  saveDisabled?: boolean;
};

function ConversationMetaForm({
  titleValue,
  previewValue,
  iconValue,
  indexValue,
  onTitleChange,
  onPreviewChange,
  onIconChange,
  onIndexChange,
  onSave,
  saveDisabled,
}: ConversationMetaFormProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: '8px',
      }}
    >
      <input
        className='admin-textarea'
        style={{ minHeight: 'auto', height: '38px', flex: '1 1 160px' }}
        value={titleValue}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <input
        className='admin-textarea'
        style={{ minHeight: 'auto', height: '38px', flex: '1 1 200px' }}
        value={previewValue}
        onChange={(e) => onPreviewChange(e.target.value)}
      />
      <input
        className='admin-textarea'
        style={{ minHeight: 'auto', height: '38px', flex: '1 1 120px' }}
        placeholder='emoji unicode name (e.g., rocket)'
        value={iconValue}
        onChange={(e) => onIconChange(e.target.value)}
      />
      <input
        className='admin-textarea'
        style={{
          minHeight: 'auto',
          height: '38px',
          width: '80px',
          flex: '0 0 auto',
        }}
        type='number'
        value={indexValue}
        onChange={(e) => onIndexChange(Number(e.target.value) || 0)}
      />
      <button
        type='button'
        className='admin-send'
        onClick={onSave}
        disabled={saveDisabled}
      >
        save
      </button>
    </div>
  );
}

export default ConversationMetaForm;
