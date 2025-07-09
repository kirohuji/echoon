// ----------------------------------------------------------------------

export default function useGetMessage({ message, participants, currentUserId }: { message: any, participants: any[], currentUserId: string }) {
  const sender = participants.find((participant: any) => participant._id === message.senderId);

  const senderDetails =
    message.senderId === currentUserId
      ? {
          type: 'me',
        }
      : {
          photoURL: sender?.photoURL,
          username: sender?.username,
          displayName: sender?.displayName,
          realName: sender?.realName,
        };

  const me = senderDetails.type === 'me';

  const hasImage = message.contentType === 'image' || message.contentType === 'jpg';

  return {
    hasImage,
    me,
    senderDetails,
  };
}
