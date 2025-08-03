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

  // 清除所有高亮
  const clearHighlights = useCallback(() => {
    const highlightedElements = window.document.querySelectorAll('.highlight');
    highlightedElements.forEach((el: any) => el.classList.remove('highlight'));
  }, []);

  // 重置播放状态
  const resetPlayback = useCallback(() => {
    setCurrentIndex(-1);
    clearHighlights();
  }, [clearHighlights]);

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
      // 暂停时不清除高亮，保持当前状态
    }
  };

  // 快退10秒
  const handleRewind10 = () => {
    if (audioRef.current) {
      const audio = audioRef.current.audioEl.current;
      const newTime = Math.max(0, audio.currentTime - 10);
      audio.currentTime = newTime;
      setCurrentTime(newTime);

      // 重新计算当前应该高亮的单词
      const currentTimeInMicro = Math.floor(newTime * 1000000000);
      updateHighlightForTime(currentTimeInMicro);
    }
  };

  // 快进10秒
  const handleForward10 = () => {
    if (audioRef.current) {
      const audio = audioRef.current.audioEl.current;
      const newTime = Math.min(audio.duration, audio.currentTime + 10);
      audio.currentTime = newTime;
      setCurrentTime(newTime);

      // 重新计算当前应该高亮的单词
      const currentTimeInMicro = Math.floor(newTime * 1000000000);
      updateHighlightForTime(currentTimeInMicro);
    }
  };

  // 根据时间更新高亮
  const updateHighlightForTime = useCallback((currentPlayTime: number) => {
    const wordTimestamps = document?.wordTimestamps || [];
    if (wordTimestamps.length === 0) return;

    // 清除所有高亮
    clearHighlights();

    // 找到当前时间对应的单词索引
    let targetIndex = -1;
    for (let i = 0; i < wordTimestamps.length; i+=1) {
      const word = wordTimestamps[i] as any;
      if (currentPlayTime >= word.start_time) {
        targetIndex = i;
      } else {
        break;
      }
    }

    // 设置当前索引并高亮对应单词
    if (targetIndex >= 0) {
      setCurrentIndex(targetIndex);
      const currentSpan = window.document.querySelector(`#word-${targetIndex}`);
      if (currentSpan) currentSpan.classList.add('highlight');
    } else {
      setCurrentIndex(-1);
    }
  }, [document?.wordTimestamps, clearHighlights]);

  const handleTimeUpdate = (value: number) => {
    setCurrentTime(value);
    const currentTimeInMicro = Math.floor(value * 1000000000);
    highlightWord(document?.wordTimestamps || [], currentTimeInMicro);
  };

  // 音频加载完成时的处理
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audio = audioRef.current.audioEl.current;
      setDuration(audio.duration);
    }
  };

  // 音频播放结束时的处理
  const handleEnded = () => {
    setPlaying(false);
    resetPlayback();
  };

  useEffect(() => {
    refresh()
  }, [refresh]);

  function renderWords(wordTimestamps: any[]) {
    return wordTimestamps.map((word, index) => <span className="word" data-start={word.start_time} id={`word-${index}`} key={index}>{word.text} </span>)
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
      <Box sx={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', p: 2 }}>
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
              onRewind10={handleRewind10}
              onForward10={handleForward10}
              audioUrl={audioUrl}
              ref={audioRef}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
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