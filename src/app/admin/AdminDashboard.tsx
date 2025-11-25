'use client';

import React, { useEffect, useState } from 'react';
import { Emoji } from 'react-apple-emojis';
import { formatAgo } from '../../lib/conversationStore';

type Message = {
  id: string;
  text: string;
  time: Date;
};

type Conversation = {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  icon?: string;
  messages: Message[];
};

type ApiMessage = Omit<Message, 'time'> & { time: string | Date };
type ApiConversation = Omit<Conversation, 'messages'> & { messages?: ApiMessage[] };

const toMessage = (msg: ApiMessage): Message => ({
  id: msg.id,
  text: msg.text,
  time: msg.time instanceof Date ? msg.time : new Date(msg.time),
});

const toConversation = (conv: ApiConversation): Conversation => ({
  id: conv.id,
  title: conv.title,
  preview: conv.preview,
  pinned: conv.pinned ?? false,
  icon: conv.icon ?? undefined,
  messages: Array.isArray(conv.messages) ? conv.messages.map(toMessage) : [],
});

function AdminDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newPreview, setNewPreview] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [newSeed, setNewSeed] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewEdits, setPreviewEdits] = useState<Record<string, string>>({});
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [pinnedEdits, setPinnedEdits] = useState<Record<string, boolean>>({});
  const [messageEdits, setMessageEdits] = useState<Record<string, string>>({});
  const [iconEdits, setIconEdits] = useState<Record<string, string>>({});
  const normEmoji = (name?: string) =>
    name ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';

  useEffect(() => {
    const parseJson = async (
      res: Response,
    ): Promise<{ conversations?: ApiConversation[]; error?: string } | null> => {
      try {
        return await res.clone().json();
      } catch {
        const raw = await res.clone().text().catch(() => '');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
    };

    const loadOnce = async () => {
      const res = await fetch('/api/admin/conversations', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const json = await parseJson(res);
      if (!res.ok || !json?.conversations) {
        throw new Error(json?.error || `failed to load conversations (status ${res.status})`);
      }
      return (json.conversations ?? []).map(toConversation);
    };

    const load = async () => {
      try {
        const convs = await loadOnce().catch(() => loadOnce());
        setConversations(convs ?? []);
        setSelectedConversation((prev) => prev ?? convs?.[0]?.id ?? null);
        setError(null);
      } catch (err: unknown) {
        setConversations([]);
        setSelectedConversation(null);
        const message = err instanceof Error ? err.message : null;
        setError(message ?? 'failed to load conversations from supabase');
      }
    };

    load();
  }, []);

  const handleSend = (conversationId: string) => {
    const text = drafts[conversationId]?.trim();
    if (!text) return;
    fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: conversationId, text }),
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok || !json.message) {
        setError(json.error ?? 'failed to append message via supabase');
        return;
      }
      const created: Message = { ...json.message, time: new Date(json.message.time) };
      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, created] }
          : conv)),
      );
      setDrafts((prev) => ({ ...prev, [conversationId]: '' }));
      setError(null);
    });
  };

  const handleDeleteMessage = (conversationId: string, messageId: string) => {
    fetch(`/api/admin/messages/${messageId}`, { method: 'DELETE' }).then(async (res) => {
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'failed to delete message');
        return;
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: conv.messages.filter((m) => m.id !== messageId) }
            : conv),
      );
      setError(null);
    });
  };

  const slugify = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `chat-${Date.now()}`;

  const handleCreate = () => {
    const title = newTitle.trim();
    const preview = newPreview.trim();
    if (!title || !preview) return;

    const baseId = slugify(title);
    const existingIds = new Set(conversations.map((c) => c.id));
    let id = baseId;
    if (existingIds.has(id)) {
      id = `${baseId}-${Date.now()}`;
    }

    const now = new Date();
    const seedMessages = newSeed.trim()
      ? [{ id: `${id}-seed`, text: newSeed.trim(), time: now }]
      : [];

    fetch('/api/admin/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.toLowerCase(),
        preview: preview.toLowerCase(),
        pinned: newPinned,
        icon: newIcon.trim() || undefined,
        seed: seedMessages[0]?.text ?? '',
      }),
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok || !json.conversation) {
        setError(json.error ?? 'failed to create thread via supabase');
        return;
      }
      const newConversation: Conversation = {
        ...json.conversation,
        messages: (json.conversation.messages ?? []).map(toMessage),
      };
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation.id);
      setError(null);
    });
    setNewTitle('');
    setNewPreview('');
    setNewPinned(false);
    setNewSeed('');
    setNewIcon('');
  };

  const handleMetaSave = (conversation: Conversation) => {
    const nextPreview = (previewEdits[conversation.id] ?? conversation.preview).trim();
    const nextTitle = (titleEdits[conversation.id] ?? conversation.title).trim();
    const nextPinned = pinnedEdits.hasOwnProperty(conversation.id)
      ? pinnedEdits[conversation.id]
      : conversation.pinned ?? false;
    const nextIcon = (iconEdits[conversation.id] ?? conversation.icon ?? '').trim();
    if (!nextPreview && !nextTitle && !iconEdits.hasOwnProperty(conversation.id) && !pinnedEdits.hasOwnProperty(conversation.id)) {
      setError('title or preview must be provided');
      return;
    }

    fetch('/api/admin/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversation.id, preview: nextPreview, title: nextTitle, pinned: nextPinned, icon: nextIcon || null }),
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok || !json.conversation) {
        setError(json.error ?? 'failed to update thread');
        return;
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id
            ? {
                ...conv,
                preview: json.conversation.preview,
                title: json.conversation.title,
                pinned: json.conversation.pinned,
                icon: json.conversation.icon,
              }
            : conv,
        ),
      );
      setPreviewEdits((prev) => ({ ...prev, [conversation.id]: json.conversation.preview }));
      setTitleEdits((prev) => ({ ...prev, [conversation.id]: json.conversation.title }));
      setPinnedEdits((prev) => ({ ...prev, [conversation.id]: json.conversation.pinned }));
      setIconEdits((prev) => ({ ...prev, [conversation.id]: json.conversation.icon ?? '' }));
      setError(null);
    });
  };

  const handleMessageSave = (conversationId: string, messageId: string) => {
    const text = messageEdits[messageId]?.trim();
    if (!text) {
      setError('message text cannot be empty');
      return;
    }
    fetch(`/api/admin/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok || !json.message) {
        setError(json.error ?? 'failed to update message');
        return;
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === messageId ? { ...m, text: json.message.text } : m,
                ),
              }
            : conv,
        ),
      );
      setMessageEdits((prev) => ({ ...prev, [messageId]: json.message.text }));
      setError(null);
    });
  };

  const handleDeleteConversation = (conversationId: string) => {
    fetch('/api/admin/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversationId }),
    }).then(async (res) => {
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'failed to delete conversation');
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setSelectedConversation((prev) => (prev === conversationId ? null : prev));
      setError(null);
    });
  };

  return (
    <div className="app-shell" style={{ alignItems: 'flex-start' }}>
      <div className="admin-panel">
        <div className="admin-title">dm backend — append messages</div>
        {error ? (
          <div className="admin-error">
            {error}
          </div>
        ) : null}
        <div className="admin-card" style={{ marginBottom: '12px' }}>
          <div className="admin-card-header" style={{ justifyContent: 'flex-start', gap: '10px' }}>
            <span className="admin-name">add a new conversation</span>
            <label className="admin-pill" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={newPinned}
                onChange={(e) => setNewPinned(e.target.checked)}
              />
              pinned
            </label>
          </div>
          <input
            className="admin-textarea"
            style={{ minHeight: 'auto', height: '38px' }}
            placeholder="title (e.g., quick links)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            className="admin-textarea"
            style={{ minHeight: 'auto', height: '38px' }}
            placeholder="preview (e.g., resume, email, socials)"
            value={newPreview}
            onChange={(e) => setNewPreview(e.target.value)}
          />
          <input
            className="admin-textarea"
            style={{ minHeight: 'auto', height: '38px' }}
            placeholder="emoji unicode name (e.g., rocket, red heart)"
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
          />
          <textarea
            className="admin-textarea"
            placeholder="optional seed message to start the thread..."
            value={newSeed}
            onChange={(e) => setNewSeed(e.target.value)}
          />
          <button
            className="admin-send"
            type="button"
            onClick={handleCreate}
            disabled={!newTitle.trim() || !newPreview.trim()}
          >
            create conversation
          </button>
        </div>
        <div className="admin-grid">
          <div className="admin-card" style={{ minHeight: '280px' }}>
            <div className="admin-card-header" style={{ marginBottom: '8px' }}>
              <span className="admin-name">conversations</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
              {conversations.map((conv) => (
                <button
                  type="button"
                  key={conv.id}
                  className={`admin-send ${selectedConversation === conv.id ? 'admin-send--active' : ''}`}
                  style={{ justifyContent: 'space-between', width: '100%' }}
                  onClick={() => setSelectedConversation(conv.id)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {conv.icon ? <Emoji name={normEmoji(conv.icon)} width={18} height={18} /> : null}
                    <span>{conv.title}</span>
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>
                    {conv.pinned ? 'pinned' : formatAgo(conv.messages.at(-1)?.time ?? new Date())}
                  </span>
                </button>
              ))}
              {!conversations.length ? (
                <div style={{ padding: '8px', color: '#888' }}>
                  {error ?? 'no threads found'}
                </div>
              ) : null}
            </div>
          </div>

          {conversations
            .filter((c) => c.id === selectedConversation)
            .map((conv) => (
              <div key={conv.id} className="admin-card" style={{ gridColumn: 'span 2' }}>
                <div className="admin-card-header">
                  <span className="admin-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {conv.icon ? <Emoji name={normEmoji(conv.icon)} width={20} height={20} /> : null}
                    {conv.title}
                  </span>
                  <label className="admin-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={
                        pinnedEdits.hasOwnProperty(conv.id)
                          ? pinnedEdits[conv.id]
                          : conv.pinned ?? false
                      }
                      onChange={(e) => setPinnedEdits((prev) => ({ ...prev, [conv.id]: e.target.checked }))}
                    />
                    pinned
                  </label>
                  <span className="admin-pill muted">
                    last: {formatAgo(conv.messages.at(-1)?.time ?? new Date())}
                  </span>
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => handleDeleteConversation(conv.id)}
                    style={{ marginLeft: 'auto' }}
                  >
                    delete thread
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    className="admin-textarea"
                    style={{ minHeight: 'auto', height: '38px', flex: '1 1 160px' }}
                    value={titleEdits[conv.id] ?? conv.title}
                    onChange={(e) => setTitleEdits((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                  />
                  <input
                    className="admin-textarea"
                    style={{ minHeight: 'auto', height: '38px', flex: '1 1 200px' }}
                    value={previewEdits[conv.id] ?? conv.preview}
                    onChange={(e) => setPreviewEdits((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                  />
                  <input
                    className="admin-textarea"
                    style={{ minHeight: 'auto', height: '38px', flex: '1 1 160px' }}
                    placeholder="emoji unicode name (e.g., rocket)"
                    value={iconEdits[conv.id] ?? conv.icon ?? ''}
                    onChange={(e) => setIconEdits((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="admin-send"
                    onClick={() => handleMetaSave(conv)}
                    disabled={
                      !(
                        (previewEdits[conv.id] ?? conv.preview).trim() ||
                        (titleEdits[conv.id] ?? conv.title).trim() ||
                        pinnedEdits.hasOwnProperty(conv.id) ||
                        iconEdits.hasOwnProperty(conv.id)
                      )
                    }
                  >
                    save
                  </button>
                </div>
                <textarea
                  className="admin-textarea"
                  placeholder="type a new message to append..."
                  value={drafts[conv.id] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                />
                <button
                  className="admin-send"
                  type="button"
                  onClick={() => handleSend(conv.id)}
                  disabled={!drafts[conv.id]?.trim()}
                >
                  add message
                </button>

                <div className="admin-messages">
                  {conv.messages.slice().reverse().map((m) => (
                    <div key={m.id} className="admin-msg-row">
                      <div style={{ flex: '1 1 auto' }}>
                        <textarea
                          className="admin-textarea"
                          style={{ minHeight: '60px' }}
                          value={messageEdits[m.id] ?? m.text}
                          onChange={(e) => setMessageEdits((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        />
                        <div className="admin-msg-meta">{formatAgo(m.time)}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          type="button"
                          className="admin-send"
                          onClick={() => handleMessageSave(conv.id, m.id)}
                          disabled={!(messageEdits[m.id] ?? m.text).trim()}
                        >
                          save
                        </button>
                        <button
                          type="button"
                          className="admin-delete"
                          onClick={() => handleDeleteMessage(conv.id, m.id)}
                          aria-label="delete message"
                        >
                          delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
