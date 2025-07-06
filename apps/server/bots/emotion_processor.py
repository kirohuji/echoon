from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import (
  Frame, 
  TranscriptionFrame,
  TransportMessageUrgentFrame,
  TTSUpdateSettingsFrame,
  LLMMessagesFrame,
  TTSTextFrame,
  TTSSpeakFrame,
  TextFrame
)
from pipecat.processors.frameworks.rtvi import (
    RTVIServerMessageFrame,
)
import re

class EmotionProcessor(FrameProcessor):
  def __init__(self):
    super().__init__()

  def extract_emotion_from_text(self, text: str) -> (str, str):
        """
        从文本中提取[emotion]标签，如果存在则返回(emotion, 去除标签后的文本)，否则返回(None, 原文本)。
        """
        match = re.match(r"\s*\[([a-zA-Z:]+)\]\s*(.*)", text)
        if match:
            emotion = match.group(1).lower()
            clean_text = match.group(2)
            return emotion, clean_text
        return None, text
  async def process_frame(self, frame: Frame, direction: FrameDirection):
    await super().process_frame(frame, direction)
    if isinstance(frame, TTSSpeakFrame):
        try:
            text = frame.text
            emotion, clean_text = self.extract_emotion_from_text(text)
            if emotion:
                await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'server-message', 'data': {'emotion': emotion}}), direction)
                await self.push_frame(TTSUpdateSettingsFrame(settings={"emotion": [emotion]}), direction)
                await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'bot-transcription', 'data': {'text': clean_text}}), direction)
            else:
                await self.push_frame(frame, direction)
            # # 只处理 type 为 bot-transcription 的消息
            # if frame.message and frame.message.get('type') == 'bot-transcription':
            #     data = frame.message.get('data') or {}
            #     text = data.get('text') or ""
            #     emotion, clean_text = self.extract_emotion_from_text(text)
            #     if emotion:
            #         data = {
            #             "emotion": emotion
            #         }
            #         await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'server-message', 'data': data}))
            #         await self.push_frame(TTSUpdateSettingsFrame(settings={"emotion": [emotion]}))
            #         await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'bot-transcription', 'data': {'text': clean_text}}), direction)
            # else:
            #   await self.push_frame(frame, direction)
        except Exception as e:
            print(f'error: {e}')
    else:
      await self.push_frame(frame, direction)