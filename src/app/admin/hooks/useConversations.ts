import { useEffect, useState } from 'react';

import { ApiConversation, ApiMessage, Conversation, Message } from '../types';
import { AuthState } from './useAdminAuth';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

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
  index: conv.index ?? 0,
  messages: Array.isArray(conv.messages) ? conv.messages.map(toMessage) : [],
});

type UseConversationsOptions = {
  authHeader: string | null;
  authState: AuthState;
  addAuth: (init?: RequestInit) => RequestInit;
  onError?: (message: string | null) => void;
  onAuthInvalid?: () => void;
};

export function useConversations({
  authHeader,
  authState,
  addAuth,
  onAuthInvalid,
  onError,
}: UseConversationsOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newPreview, setNewPreview] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [newSeed, setNewSeed] = useState('');
  const [newIcon, setNewIcon] = useState('');

  const [previewEdits, setPreviewEdits] = useState<Record<string, string>>({});
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [pinnedEdits, setPinnedEdits] = useState<Record<string, boolean>>({});
  const [messageEdits, setMessageEdits] = useState<Record<string, string>>({});
  const [iconEdits, setIconEdits] = useState<Record<string, string>>({});
  const [indexEdits, setIndexEdits] = useState<Record<string, number>>({});

  const parseJson = async (
    res: Response
  ): Promise<{ conversations?: ApiConversation[]; error?: string } | null> => {
    try {
      return await res.clone().json();
    } catch {
      const raw = await res
        .clone()
        .text()
        .catch(() => '');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          '/api/admin/conversations',
          addAuth({
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          })
        );
        const json = await parseJson(res);
        if (!res.ok || !json?.conversations) {
          const error = new Error(
            json?.error || `failed to load conversations (status ${res.status})`
          );
          (error as Error & { status?: number }).status = res.status;
          throw error;
        }
        const convs = (json.conversations ?? []).map(toConversation);
        setConversations(convs);
        setSelectedConversation((prev) => prev ?? convs?.[0]?.id ?? null);
        onError?.(null);
      } catch (err: unknown) {
        setConversations([]);
        setSelectedConversation(null);
        const message = err instanceof Error ? err.message : null;
        const status = (err as Error & { status?: number })?.status;
        if (
          status === 401 ||
          (message ?? '').toLowerCase().includes('unauthorized')
        ) {
          onError?.('authentication required: username or password incorrect');
          onAuthInvalid?.();
          return;
        }
        onError?.(message ?? 'failed to load conversations from supabase');
      }
    };

    if (authState === 'authed' && authHeader) {
      load();
    }
  }, [authHeader, authState, addAuth, onAuthInvalid, onError]);

  const handleUnauthorized = (message?: string | null) => {
    onError?.(
      message ?? 'authentication required: username or password incorrect'
    );
    onAuthInvalid?.();
  };

  const handleSend = async (conversationId: string, file?: File | null) => {
    const text = drafts[conversationId]?.trim();
    if (!text && !file) return;

    let attachmentUrl: string | null = null;
    let attachmentType: string | null = null;

    if (file) {
      try {
        const supabase = getSupabaseBrowserClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${conversationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) {
          onError?.(uploadError.message);
          return;
        }

        const { data } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
        
        attachmentUrl = data.publicUrl;
        attachmentType = file.type.startsWith('image/') ? 'image' : 'file';
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'failed to upload file');
        return;
      }
    }

    fetch('/api/admin/messages', {
      method: 'POST',
      ...addAuth({ headers: { 'Content-Type': 'application/json' } }),
      body: JSON.stringify({
        threadId: conversationId,
        text,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      }),
    }).then(async (res) => {
      const json = await res.json();
      if (res.status === 401) {
        handleUnauthorized(json.error);
        return;
      }
      if (!res.ok || !json.message) {
        onError?.(json.error ?? 'failed to append message via supabase');
        return;
      }
      const created: Message = {
        ...json.message,
        time: new Date(json.message.time),
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: [...conv.messages, created] }
            : conv
        )
      );
      setDrafts((prev) => ({ ...prev, [conversationId]: '' }));
      onError?.(null);
    });
  };

  const handleDeleteMessage = (conversationId: string, messageId: string) => {
    fetch(
      `/api/admin/messages/${messageId}`,
      addAuth({ method: 'DELETE' })
    ).then(async (res) => {
      if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        handleUnauthorized((json as { error?: string }).error);
        return;
      }
      if (!res.ok) {
        const json = await res.json();
        onError?.(json.error ?? 'failed to delete message');
        return;
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.filter((m) => m.id !== messageId),
              }
            : conv
        )
      );
      onError?.(null);
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
      ...addAuth({ headers: { 'Content-Type': 'application/json' } }),
      body: JSON.stringify({
        title: title.toLowerCase(),
        preview: preview.toLowerCase(),
        pinned: newPinned,
        icon: newIcon.trim() || undefined,
        seed: seedMessages[0]?.text ?? '',
      }),
    }).then(async (res) => {
      const json = await res.json();
      if (res.status === 401) {
        handleUnauthorized(json.error);
        return;
      }
      if (!res.ok || !json.conversation) {
        onError?.(json.error ?? 'failed to create thread via supabase');
        return;
      }
      const newConversation: Conversation = {
        ...json.conversation,
        messages: (json.conversation.messages ?? []).map(toMessage),
      };
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation.id);
      onError?.(null);
    });
    setNewTitle('');
    setNewPreview('');
    setNewPinned(false);
    setNewSeed('');
    setNewIcon('');
  };

  const handleMetaSave = (conversation: Conversation) => {
    const nextPreview = (
      previewEdits[conversation.id] ?? conversation.preview
    ).trim();
    const nextTitle = (
      titleEdits[conversation.id] ?? conversation.title
    ).trim();
    const nextPinned = pinnedEdits.hasOwnProperty(conversation.id)
      ? pinnedEdits[conversation.id]
      : (conversation.pinned ?? false);
    const nextIcon = (
      iconEdits[conversation.id] ??
      conversation.icon ??
      ''
    ).trim();
    const nextIndex = indexEdits.hasOwnProperty(conversation.id)
      ? indexEdits[conversation.id]
      : (conversation.index ?? 0);

    if (
      !nextPreview &&
      !nextTitle &&
      !iconEdits.hasOwnProperty(conversation.id) &&
      !pinnedEdits.hasOwnProperty(conversation.id) &&
      !indexEdits.hasOwnProperty(conversation.id)
    ) {
      onError?.('title or preview must be provided');
      return;
    }

    fetch('/api/admin/conversations', {
      method: 'PATCH',
      ...addAuth({ headers: { 'Content-Type': 'application/json' } }),
      body: JSON.stringify({
        id: conversation.id,
        preview: nextPreview,
        title: nextTitle,
        pinned: nextPinned,
        icon: nextIcon || null,
        index: nextIndex,
      }),
    }).then(async (res) => {
      const json = await res.json();
      if (res.status === 401) {
        handleUnauthorized(json.error);
        return;
      }
      if (!res.ok || !json.conversation) {
        onError?.(json.error ?? 'failed to update thread');
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
                index: json.conversation.index,
              }
            : conv
        )
      );
      setPreviewEdits((prev) => ({
        ...prev,
        [conversation.id]: json.conversation.preview,
      }));
      setTitleEdits((prev) => ({
        ...prev,
        [conversation.id]: json.conversation.title,
      }));
      setPinnedEdits((prev) => ({
        ...prev,
        [conversation.id]: json.conversation.pinned,
      }));
      setIconEdits((prev) => ({
        ...prev,
        [conversation.id]: json.conversation.icon ?? '',
      }));
      setIndexEdits((prev) => ({
        ...prev,
        [conversation.id]: json.conversation.index ?? 0,
      }));
      onError?.(null);
    });
  };

  const handleMessageSave = (conversationId: string, messageId: string) => {
    const text = messageEdits[messageId]?.trim();
    if (!text) {
      onError?.('message text cannot be empty');
      return;
    }
    fetch(`/api/admin/messages/${messageId}`, {
      method: 'PATCH',
      ...addAuth({ headers: { 'Content-Type': 'application/json' } }),
      body: JSON.stringify({ text }),
    }).then(async (res) => {
      if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        handleUnauthorized((json as { error?: string }).error);
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.message) {
        onError?.(json.error ?? 'failed to update message');
        return;
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === messageId ? { ...m, text: json.message.text } : m
                ),
              }
            : conv
        )
      );
      setMessageEdits((prev) => ({ ...prev, [messageId]: json.message.text }));
      onError?.(null);
    });
  };

  const handleDeleteConversation = (conversationId: string) => {
    fetch('/api/admin/conversations', {
      method: 'DELETE',
      ...addAuth({ headers: { 'Content-Type': 'application/json' } }),
      body: JSON.stringify({ id: conversationId }),
    }).then(async (res) => {
      if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        handleUnauthorized((json as { error?: string }).error);
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        onError?.(json.error ?? 'failed to delete conversation');
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setSelectedConversation((prev) =>
        prev === conversationId ? null : prev
      );
      onError?.(null);
    });
  };

  return {
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
  };
}
