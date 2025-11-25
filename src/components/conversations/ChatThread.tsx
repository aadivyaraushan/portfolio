'use client';

import React, { useMemo } from 'react';
import ChatComposer from '@/components/conversations/ChatComposer';
import ChatHeader from '@/components/conversations/ChatHeader';
import ChatMessages from '@/components/conversations/ChatMessages';
import { Conversation } from '@/lib/conversationStore';
import { annotateMessages } from '@/lib/conversationUi';

type ChatThreadProps = {
  conversation: Conversation | null;
  loading: boolean;
};

const ChatThread = ({ conversation, loading }: ChatThreadProps) => {
  const annotatedMessages = useMemo(
    () => annotateMessages(conversation),
    [conversation]
  );

  return (
    <section className='thread'>
      {conversation ? (
        <>
          <ChatHeader conversation={conversation} />
          <ChatMessages messages={annotatedMessages} loading={loading} />
          <ChatComposer conversationTitle={conversation.title} />
        </>
      ) : null}
    </section>
  );
};

export default ChatThread;
