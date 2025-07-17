import { useCallback, useEffect, useRef, useState } from "react";
import { MainContent } from 'src/layouts/main';
import { Box, Stack, Typography } from '@mui/material';
import Scrollbar from 'src/components/scrollbar';
import { useParams } from 'src/routes/hooks';
import { documentService, pipecatService } from "src/composables/context-provider";
import { ArticleListeningPreview } from '../article-listening-preview';
import { ArticleListeningWave } from '../article-listening-wave';
import { ArticleListeningProcess } from '../article-listening-process';
import { ArticleListeningToolbar } from '../article-listening-toolbar';
import { ArticleListeningPlayer } from '../article-listening-player';

export default function ReadingView() {
  const { id } = useParams();

  const [loading, setLoading] = useState(false);

  const [article, setArticle] = useState({
    content: 'Reading'
  });

  const [playing, setPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const [duration, setDuration] = useState(0);

  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<any>(null);

  const [document, setDocument] = useState({});

  const [audioUrl, setAudioUrl] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.get({
        id
      });
      setDocument(res.data);
      const fullAudioUrl = await pipecatService.downloadAudio(res.data.fileUrl);
      setAudioUrl(fullAudioUrl);
    } catch (error) {
      console.error('获取文档失败:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.audioEl.current.play();
      setPlaying(true);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.audioEl.current.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = (value: number) => {
    setCurrentTime(value);
  };

  useEffect(() => {
    refresh()
  }, [refresh]);

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
              audioUrl={audioUrl}
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
              onPlay={handlePlay}
              onPause={handlePause}
              onPreviousSentence={() => { }}
              onNextSentence={() => { }}
              // onRewind10={handleRewind10}
              // onForward10={handleForward10}
              audioUrl={audioUrl}
              ref={audioRef}
              onTimeUpdate={handleTimeUpdate}
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