'use client';

import { useMemo, useState } from 'react';

import AdminLayout from './components/AdminLayout';
import AuthForm from './components/AuthForm';
import AuthGate from './components/AuthGate';
import ConversationDetailPanel from './components/ConversationDetailPanel';
import ConversationList from './components/ConversationList';
import ConversationListPanel from './components/ConversationListPanel';
import NewConversationCard from './components/NewConversationCard';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useConversations } from './hooks/useConversations';
import { Conversation } from './types';

function AdminDashboard() {
  const [error, setError] = useState<string | null>(null);

  const {
    adminUser,
    adminPass,
    setAdminUser,
    setAdminPass,
    authHeader,
    authState,
    addAuth,
    handleAuthSubmit,
    handleLogout,
    invalidateAuth,
  } = useAdminAuth({ onError: setError });

  const {
    conversations,
    selectedConversation,
    setSelectedConversation,
    drafts,
    setDrafts,
    newTitle,
    setNewTitle,
    newPreview,
    setNewPreview,
    newPinned,
    setNewPinned,
    newSeed,
    setNewSeed,
    newIcon,
    setNewIcon,
    previewEdits,
    setPreviewEdits,
    titleEdits,
    setTitleEdits,
    pinnedEdits,
    setPinnedEdits,
    messageEdits,
    setMessageEdits,
    iconEdits,
    setIconEdits,
    indexEdits,
    setIndexEdits,
    handleSend,
    handleDeleteMessage,
    handleCreate,
    handleMetaSave,
    handleMessageSave,
    handleDeleteConversation,
  } = useConversations({
    authHeader,
    authState,
    addAuth,
    onAuthInvalid: invalidateAuth,
    onError: setError,
  });

  const selected = useMemo<Conversation | null>(
    () => conversations.find((c) => c.id === selectedConversation) ?? null,
    [conversations, selectedConversation]
  );

  const authFallback = (
    <AuthForm
      adminUser={adminUser}
      adminPass={adminPass}
      onUserChange={setAdminUser}
      onPassChange={setAdminPass}
      onSubmit={handleAuthSubmit}
      error={error}
      pending={authState === 'pending'}
    />
  );

  const getPinnedValue = (conv: Conversation) =>
    pinnedEdits.hasOwnProperty(conv.id)
      ? pinnedEdits[conv.id]
      : (conv.pinned ?? false);
  const getTitleValue = (conv: Conversation) =>
    titleEdits[conv.id] ?? conv.title;
  const getPreviewValue = (conv: Conversation) =>
    previewEdits[conv.id] ?? conv.preview;
  const getIconValue = (conv: Conversation) =>
    iconEdits[conv.id] ?? conv.icon ?? '';
  const getIndexValue = (conv: Conversation) =>
    indexEdits.hasOwnProperty(conv.id)
      ? indexEdits[conv.id]
      : (conv.index ?? 0);

  const metaSaveDisabled = (conv: Conversation) =>
    !(
      getPreviewValue(conv).trim() ||
      getTitleValue(conv).trim() ||
      pinnedEdits.hasOwnProperty(conv.id) ||
      iconEdits.hasOwnProperty(conv.id) ||
      indexEdits.hasOwnProperty(conv.id)
    );

  return (
    <AuthGate authState={authState} fallback={authFallback}>
      <AdminLayout onLogout={handleLogout} error={error}>
        <NewConversationCard
          newTitle={newTitle}
          newPreview={newPreview}
          newPinned={newPinned}
          newSeed={newSeed}
          newIcon={newIcon}
          onTitleChange={setNewTitle}
          onPreviewChange={setNewPreview}
          onPinnedChange={setNewPinned}
          onSeedChange={setNewSeed}
          onIconChange={setNewIcon}
          onCreate={handleCreate}
        />

        <div className='admin-grid'>
          <ConversationListPanel>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
              emptyMessage={error ?? 'no threads found'}
            />
          </ConversationListPanel>

          {selected ? (
            <ConversationDetailPanel
              conversation={selected}
              titleValue={getTitleValue(selected)}
              previewValue={getPreviewValue(selected)}
              iconValue={getIconValue(selected)}
              pinnedValue={getPinnedValue(selected)}
              indexValue={getIndexValue(selected)}
              draftValue={drafts[selected.id] ?? ''}
              messageEdits={messageEdits}
              saveDisabled={metaSaveDisabled(selected)}
              onTitleChange={(val) =>
                setTitleEdits((prev) => ({ ...prev, [selected.id]: val }))
              }
              onPreviewChange={(val) =>
                setPreviewEdits((prev) => ({ ...prev, [selected.id]: val }))
              }
              onIconChange={(val) =>
                setIconEdits((prev) => ({ ...prev, [selected.id]: val }))
              }
              onPinnedChange={(val) =>
                setPinnedEdits((prev) => ({ ...prev, [selected.id]: val }))
              }
              onIndexChange={(val) =>
                setIndexEdits((prev) => ({
                  ...prev,
                  [selected.id]: Number.isNaN(Number(val)) ? 0 : Number(val),
                }))
              }
              onSaveMeta={() => handleMetaSave(selected)}
              onDraftChange={(val) =>
                setDrafts((prev) => ({ ...prev, [selected.id]: val }))
              }
              onSend={(file) => handleSend(selected.id, file)}
              onDeleteConversation={() => handleDeleteConversation(selected.id)}
              onMessageChange={(messageId, val) =>
                setMessageEdits((prev) => ({ ...prev, [messageId]: val }))
              }
              onMessageSave={(messageId) =>
                handleMessageSave(selected.id, messageId)
              }
              onMessageDelete={(messageId) =>
                handleDeleteMessage(selected.id, messageId)
              }
            />
          ) : null}
        </div>
      </AdminLayout>
    </AuthGate>
  );
}

export default AdminDashboard;
