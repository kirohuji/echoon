import { Badge, Box, Avatar, ListItemButton, Stack, Typography, ListItemText } from "@mui/material";
import { zhCN } from 'date-fns/locale';
import { formatDistanceToNowStrict } from "date-fns";
import { useAuthContext } from "src/auth/hooks";

export default function ChatNavItem({
  conversation,
  selected,
  collapse,
  onClick,
}: {
  conversation: any;
  selected: boolean;
  collapse: boolean;
  onClick: (conversation: any) => void;
}) {
  const { user } = useAuthContext();
  const { title, messages, participants } = conversation;
  const participant = participants.find((p: any) => p.id !== user?.id);
  const username = participant?.personal?.name
  const displayText = messages[0]?.content;
  const photoURL = participant?.personal?.photoURL
  const lastActivity = messages[0]?.createdAt;

  return (
    <ListItemButton
      onClick={() => onClick(conversation)}
      disableGutters
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        bgcolor: 'background.default',
        // height: '100%',
        py: 1.5,
        px: 2.5,
        // pl: 0,
        // pr: 0,
        ...(selected && {
          bgcolor: 'action.selected',
        }),
      }}
    >
      <Badge color="error" overlap="circular" badgeContent={conversation.unreadCount} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Avatar alt={username} src={photoURL} sx={{ width: 48, height: 48 }} />
      </Badge>
      {
        !collapse && (
          <>
            <ListItemText
              sx={{ ml: 2 }}
              primary={`${title}`}
              secondary={displayText}
              slotProps={{
                primary: {
                  noWrap: true,
                  variant: 'subtitle2',
                },
                secondary: {
                  noWrap: true,
                  component: 'span',
                  variant: conversation.unreadCount ? 'subtitle2' : 'body2',
                  color: conversation.unreadCount ? 'text.primary' : 'text.secondary',
                },
              }}
            />
            {lastActivity && (
              <Stack alignItems="flex-end" sx={{ ml: 2, height: 44 }}>
                <Typography
                  noWrap
                  variant="body2"
                  component="span"
                  sx={{
                    mb: 1.5,
                    fontSize: 12,
                    color: 'text.disabled',
                  }}
                >
                  {formatDistanceToNowStrict(new Date(lastActivity), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </Typography>
                {!!conversation.unreadCount && (
                  <Box sx={{ width: 8, height: 8, bgcolor: 'info.main', borderRadius: '50%' }} />
                )}
              </Stack>
            )}
          </>
        )
      }
    </ListItemButton>
  )
}