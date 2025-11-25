import { ReactNode } from 'react';

type ConversationListPanelProps = {
  children: ReactNode;
};

function ConversationListPanel({ children }: ConversationListPanelProps) {
  return (
    <div className="admin-card" style={{ minHeight: '280px' }}>
      <div className="admin-card-header" style={{ marginBottom: '8px' }}>
        <span className="admin-name">conversations</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

export default ConversationListPanel;
