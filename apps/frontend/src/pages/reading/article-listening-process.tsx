// @mui
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function ArticleListeningProcess({ loading, currentTime, duration, ...other }: {
  loading: boolean;
  currentTime: number;
  duration: number;
  other?: any;
}) {
  if (loading) {
    return (
      <Stack direction="row" justifyContent="space-between" {...other}>
        <Skeleton width={80} height={28} />
        <Skeleton width={80} height={28} />
      </Stack>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Stack direction="row" justifyContent="space-between" {...other}>
      <Typography variant="body1" sx={{ fontWeight: 'normal' }}>
        {formatTime(currentTime)}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 'normal' }}>
        {formatTime(duration)}
      </Typography>
    </Stack>
  );
}
