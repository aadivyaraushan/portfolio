'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChatSidebar from '@/components/conversations/ChatSidebar';
import ChatThread from '@/components/conversations/ChatThread';
import { Conversation, fetchConversations } from '@/lib/conversationStore';
import { trackEvent } from '@/lib/analytics';

function PageContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const visitTracked = useRef(false);

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

  useEffect(() => {
    if (visitTracked.current || loading) return;
    visitTracked.current = true;
    trackEvent('visit', { conversationsCount: conversations.length });
  }, [loading, conversations.length]);

  useEffect(() => {
    if (!activeConversation) return;
    trackEvent('conversation_viewed', {
      id: activeConversation.id,
      title: activeConversation.title,
      pinned: Boolean(activeConversation.pinned),
    });
  }, [activeConversation?.id]);

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
