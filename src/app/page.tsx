'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ChatSidebar from '@/components/conversations/ChatSidebar';
import ChatThread from '@/components/conversations/ChatThread';
import { Conversation, fetchConversations } from '@/lib/conversationStore';

function PageContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchConversations();
        setConversations(data);
        setActiveId((prev) => prev ?? data[0]?.id ?? null);
        setError(null);
      } catch (err) {
        setConversations([]);
        setActiveId(null);
        const message =
          err instanceof Error
            ? err.message
            : 'failed to load conversations from supabase';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeConversation = useMemo(() => {
    if (!conversations.length) return null;
    const found = conversations.find((conv) => conv.id === activeId);
    return found ?? conversations[0];
  }, [activeId, conversations]);

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setIsSidebarOpen(false); // close overlay on mobile when a conversation is selected
  };

  return (
    <div className='app-shell'>
      <div className='dm-frame'>
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          loading={loading}
          error={error}
        />
        <ChatThread
          conversation={activeConversation}
          loading={loading}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
      </div>

      {isSidebarOpen && (
        <div
          className='sidebar--mobile-overlay'
          onClick={() => setIsSidebarOpen(false)}
        >
          <ChatSidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelectConversation}
            loading={loading}
            error={error}
          />
        </div>
      )}
    </div>
  );
}

function Home() {
  return <PageContent />;
}

export default Home;
