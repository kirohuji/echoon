import { useEffect, useRef, useState } from "react";
import { MainContent } from 'src/layouts/main';
import { Box, Stack, Typography } from '@mui/material';
import Scrollbar from 'src/components/scrollbar';
import { ArticleListeningPreview } from '../article-listening-preview';
import { ArticleListeningWave } from '../article-listening-wave';
import { ArticleListeningProcess } from '../article-listening-process';
import { ArticleListeningToolbar } from '../article-listening-toolbar';
import { ArticleListeningPlayer } from '../article-listening-player';

export default function ReadingView() {
  const [loading, setLoading] = useState(false);

  const [article, setArticle] = useState({
    content: 'Reading'
  });

  const [playing, setPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const [duration, setDuration] = useState(0);

  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef(null);

  useEffect(() => {
    console.log("ReadingView");
  }, []);

  return (
    <MainContent
      disablePadding
      maxWidth={false}
    >
      <Typography variant="h6" sx={{ mb: { xs: 3, md: 5 } }}>
        Reading
      </Typography>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Scrollbar sx={{ height: '100%' }}>
            <ArticleListeningPreview loading={loading} text={article?.content || ''} />
          </Scrollbar>
        </Box>

        <Box sx={{
          flexShrink: 0,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}>
          <Stack>
            <ArticleListeningWave
              loading={loading}
              audioUrl="https://hope.lourd.top/storage/manages/storage:manages/DpTsNvHiP9tMWWihd/original/DpTsNvHiP9tMWWihd.mp3"
              currentTime={currentTime}
              playbackRate={playbackRate}
            />
            <ArticleListeningProcess
              loading={loading}
              currentTime={currentTime}
              duration={duration}
            />
            <ArticleListeningPlayer
              loading={loading}
              playing={playing}
              // onPlay={handlePlay}
              // onPause={handlePause}
              onPreviousSentence={() => { }}
              onNextSentence={() => { }}
              // onRewind10={handleRewind10}
              // onForward10={handleForward10}
              audioUrl="https://hope.lourd.top/storage/manages/storage:manages/DpTsNvHiP9tMWWihd/original/DpTsNvHiP9tMWWihd.mp3"
              ref={audioRef}
              // onTimeUpdate={handleTimeUpdate}
              // onLoadedMetadata={handleLoadedMetadata}
            />
            <ArticleListeningToolbar
              loading={loading}
              playbackRate={playbackRate}
            // onPlaybackRateChange={handlePlaybackRateChange}
            />
          </Stack>
        </Box>

      </Box>
    </MainContent>
  )
}