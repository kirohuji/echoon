// ----------------------------------------------------------------------

export default function useGetMessage({ message, participants, currentUserId }: { message: any, participants: any[], currentUserId: string }) {
  const sender = participants.find((participant: any) => participant.id === message.senderId);

  const senderDetails =
    message.senderId === currentUserId
      ? {
          type: 'me',
        }
      : {
          photoURL: sender?.photoURL,
          username: sender?.name,
        };

  const me = senderDetails.type === 'me';

  const hasImage = false;

  return {
    hasImage,
    me,
    senderDetails,
  };
}
