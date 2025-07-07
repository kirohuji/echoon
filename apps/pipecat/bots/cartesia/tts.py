from pipecat.services.cartesia.tts import CartesiaTTSService
from typing import Optional
from pydantic import BaseModel
from pipecat.transcriptions.language import Language
from loguru import logger
from pipecat.frames.frames import Frame, TTSStartedFrame, TTSStoppedFrame, TransportMessageUrgentFrame, TTSUpdateSettingsFrame
from pipecat.utils.tracing.service_decorators import traced_tts
import uuid
from typing import AsyncGenerator
import re

class CartesiaTTSEmotionService(CartesiaTTSService):
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

    @traced_tts
    async def run_tts(self, text: str) -> AsyncGenerator[Frame, None]:
        # emotion, clean_text = self.extract_emotion_from_text(text)
        # if emotion:
        #     text = clean_text
        #     await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'server-message', 'data': {'emotion': emotion}}))
        #     await self.push_frame(TTSUpdateSettingsFrame(settings={"emotion": [emotion]}))
        #     self._settings["emotion"] = [emotion]

        logger.debug(f"{self}: Generating TTS [{text}]")

        try:
            if not self._websocket or self._websocket.closed:
                await self._connect()

            if not self._context_id:
                await self.start_ttfb_metrics()
                yield TTSStartedFrame()
                self._context_id = str(uuid.uuid4())
                await self.create_audio_context(self._context_id)

            msg = self._build_msg(text=text)

            try:
                await self._get_websocket().send(msg)
                await self.start_tts_usage_metrics(text)
            except Exception as e:
                logger.error(f"{self} error sending message: {e}")
                yield TTSStoppedFrame()
                await self._disconnect()
                await self._connect()
                return
            yield None
        except Exception as e:
            logger.error(f"{self} exception: {e}")
