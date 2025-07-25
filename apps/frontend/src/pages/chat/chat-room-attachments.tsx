// @mui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// utils
import { fDateTime } from 'src/utils/format-time';
// components
import { Iconify } from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import FileThumbnail from 'src/components/file-thumbnail';

// ----------------------------------------------------------------------

export default function ChatRoomAttachments({ attachments }: { attachments: any[] }) {
  const collapse = useBoolean(true);

  const totalAttachments = attachments.length;

  const renderBtn = (
    <ListItemButton
      disabled={!attachments.length}
      onClick={collapse.onToggle}
      sx={{
        pl: 2.5,
        pr: 1.5,
        height: 40,
        flexShrink: 0,
        flexGrow: 'unset',
        typography: 'overline',
        color: 'text.secondary',
        bgcolor: 'background.neutral',
      }}
    >
      <Box component="span" sx={{ flexGrow: 1 }}>
        附件 ({totalAttachments}) (最多保存3天)
      </Box>
      <Iconify
        width={16}
        icon={
          (!collapse.value && 'eva:arrow-ios-forward-fill') ||
          (!attachments.length && 'eva:arrow-ios-forward-fill') ||
          'eva:arrow-ios-downward-fill'
        }
      />
    </ListItemButton>
  );

  const renderContent = (
    <Scrollbar sx={{ px: 2, py: 2.5, height: '100%' }}>
      {attachments.map((attachment: any, index: number) => (
        <Stack
          key={attachment.name + index}
          spacing={1.5}
          direction="row"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 1,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: 'background.neutral',
            }}
          >
            <FileThumbnail
              tooltip={false}
              imgSx={{ width: 28, height: 28 }}
              imageView
              file={attachment.preview}
              onDownload={() => {
                window.open(attachment.preview, 'blank');
              }}
              sx={{ width: 28, height: 28 }}
            />
          </Stack>

          <ListItemText
            primary={attachment.name}
            secondary={fDateTime(attachment.createdAt)}
            primaryTypographyProps={{
              noWrap: true,
              typography: 'body2',
            }}
            secondaryTypographyProps={{
              mt: 0.25,
              noWrap: true,
              component: 'span',
              typography: 'caption',
              color: 'text.disabled',
            }}
          />
        </Stack>
      ))}
    </Scrollbar>
  );

  return (
    <>
      {renderBtn}

      <Box
        sx={{
          overflow: 'hidden',
          height: collapse.value ? 1 : 0,
          transition: (theme) =>
            theme.transitions.create(['height'], {
              duration: theme.transitions.duration.shorter,
            }),
        }}
      >
        {renderContent}
      </Box>
    </>
  );
}