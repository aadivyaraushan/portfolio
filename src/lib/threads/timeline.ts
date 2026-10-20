// Turns a flat message list into what the thread view draws: time stamps between
// groups, and a tail only on the last bubble of each group (as iMessage does).

const GROUP_GAP_MS = 60 * 60 * 1000;

type TimelineMessage = { id: string; sentAt: string; from: 'me' | 'visitor' };

export type TimelineItem<M extends TimelineMessage> =
  | { kind: 'stamp'; key: string; sentAt: string }
  | { kind: 'message'; key: string; message: M; tail: boolean; showSender: boolean };

export function buildTimeline<M extends TimelineMessage>(messages: M[]): TimelineItem<M>[] {
  return messages.flatMap((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const gapBefore =
      !previous || Date.parse(message.sentAt) - Date.parse(previous.sentAt) > GROUP_GAP_MS;
    const startsGroup = gapBefore || previous.from !== message.from;
    const endsGroup =
      !next ||
      next.from !== message.from ||
      Date.parse(next.sentAt) - Date.parse(message.sentAt) > GROUP_GAP_MS;

    const bubble: TimelineItem<M> = {
      kind: 'message',
      key: message.id,
      message,
      tail: endsGroup,
      showSender: startsGroup && message.from === 'me',
    };
    return gapBefore
      ? [{ kind: 'stamp' as const, key: `stamp-${message.id}`, sentAt: message.sentAt }, bubble]
      : [bubble];
  });
}
