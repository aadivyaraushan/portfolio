export type Message = {
  id: string;
  text: string;
  attachment_url?: string | null;
  attachment_type?: 'image' | 'file' | null;
  time: Date;
};

export type Conversation = {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  icon?: string;
  index?: number;
  messages: Message[];
};

export type ApiMessage = Omit<Message, 'time'> & { time: string | Date };
export type ApiConversation = Omit<Conversation, 'messages'> & {
  messages?: ApiMessage[];
};
