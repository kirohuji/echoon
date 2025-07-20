import { useCallback, useEffect, useRef, useState } from "react";
import { MainContent } from 'src/layouts/main';
import { Box, Stack, Typography } from '@mui/material';
import Scrollbar from 'src/components/scrollbar';
import { useParams } from 'src/routes/hooks';
import { documentService, pipecatService } from "src/composables/context-provider";
// import { ArticleListeningPreview } from '../article-listening-preview';
// import { ArticleListeningWave } from '../article-listening-wave';
import { ArticleListeningProcess } from '../article-listening-process';
import { ArticleListeningToolbar } from '../article-listening-toolbar';
import { ArticleListeningPlayer } from '../article-listening-player';

export default function ReadingView() {
  const { id } = useParams();

  const [loading, setLoading] = useState(false);

  const [playing, setPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(-1);

  const [duration, setDuration] = useState(0);

  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<any>(null);

  const [document, setDocument] = useState({
    content: '',
    wordTimestamps: []
  });

  const [audioUrl, setAudioUrl] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.get({
        id
      });
      const baseTime = res.data.wordTimestamps[0].start_time;
      const wordTimestamps = res.data.wordTimestamps.map((item: any) => ({
        ...item,
        start_time: (item.start_time - baseTime)
      }));
      setDocument({
        ...res.data,
        wordTimestamps
      });
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
      setCurrentIndex(-1);
      const highlightedElements = window.document.querySelectorAll('.highlight');
      highlightedElements.forEach((el: any) => el.classList.remove('highlight'));
    }
  };

  const handleTimeUpdate = (value: number) => {
    setCurrentTime(value);
    const currentTimeInMicro = Math.floor(value * 1000000000);
    highlightWord(document?.wordTimestamps || [], currentTimeInMicro);
  };

  useEffect(() => {
    refresh()
  }, [refresh]);

  function renderWords(wordTimestamps: any[]) {
    return wordTimestamps.map((word, index) =>  <span className="word" data-start={word.start_time} id={`word-${index}`} key={index}>{word.text} </span>)
  }

  function highlightWord(wordTimestamps: any[], currentPlayTime: number) {
    const next = wordTimestamps[currentIndex + 1];
    if (next && currentPlayTime >= next.start_time) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
  
      const currentSpan = window.document.querySelector(`#word-${newIndex}`);
      if (currentSpan) currentSpan.classList.add('highlight');
    } else if (!next) {
      const currentWord = wordTimestamps[currentIndex];
      if (currentPlayTime >= currentWord.start_time) {
        const currentSpan = window.document.querySelector(`#word-${currentIndex}`);
        if (currentSpan) currentSpan.classList.add('highlight');
      }
    }
  }
  

  return (
    <MainContent
      disablePadding
      maxWidth={false}
    >
      <Typography variant="h6" sx={{ mb: { xs: 3, md: 5 } }}>
        Reading
      </Typography>
      <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: 2 }}>
        <Box sx={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
          <Scrollbar sx={{ height: '100%' }}>
            {
              renderWords(document?.wordTimestamps || [])
            }
            {/* <ArticleListeningPreview loading={loading} text={document?.content || ''} /> */}
          </Scrollbar>
        </Box>

        <Box sx={{
          flexShrink: 0,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}>
          <Stack>
            {/* <ArticleListeningWave
              loading={loading}
              audioUrl={audioUrl}
              currentTime={currentTime}
              playbackRate={playbackRate}
            /> */}
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