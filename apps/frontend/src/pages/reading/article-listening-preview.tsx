// @mui
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import Markdown from 'src/components/markdown';

// ----------------------------------------------------------------------

export function ArticleListeningPreview({ loading, text, ...other }: {
  loading: boolean;
  text: string;
  other?: any;
}) {
  if (loading) {
    return (
      <Paper sx={{ p: 3 }} {...other}>
        <Stack spacing={2}>
          <Skeleton height={20} width="80%" />
          <Skeleton height={20} width="90%" />
          <Skeleton height={20} width="70%" />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }} {...other}>
      <Markdown children={text} />
    </Paper>
  );
}
