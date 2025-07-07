from pipecat.services.tts_service import TTSService
from typing import AsyncGenerator, Optional
from hume.client import AsyncHumeClient
from hume.expression_measurement.stream.stream.types.subscribe_event import SubscribeEvent
from hume.expression_measurement.stream.stream.types.config import Config
from hume.expression_measurement.stream.socket_client import StreamConnectOptions
from hume.expression_measurement.stream.stream.types.stream_model_predictions import StreamModelPredictions
from hume.expression_measurement.stream.stream.types.stream_language import StreamLanguage
import base64
from hume.tts import FormatPcm, PostedContextWithGenerationId, PostedUtterance, PostedUtteranceVoiceWithId
from pipecat.utils.tracing.service_decorators import traced_tts
from pipecat.frames.frames import (
    ErrorFrame,
    Frame,
    StartFrame,
    TTSAudioRawFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
)

from loguru import logger
from .utils import resample_pcm

class HumeTTSService(TTSService):
    def __init__(
        self,
        *,
        api_key: str,
        **kwargs,
    ):
      super().__init__(**kwargs)
      self.api_key = api_key
      self.hume_client = AsyncHumeClient(api_key=self.api_key)
      self.model_config = Config(language=StreamLanguage(granularity="sentence"))
      self.stream_connect_options = StreamConnectOptions(api_key=self.api_key)
      self.socket = None  # 新增，持久化 socket

    async def _connect(self):
        # 初始化时建立 websocket 连接
        self.socket = await self.hume_client.expression_measurement.stream.connect(
            options={"config": self.model_config}
        ).__aenter__()

    def can_generate_metrics(self) -> bool:
        return True

    @traced_tts
    async def run_tts(self, text: str) -> AsyncGenerator[Frame, None]:
        logger.debug(f"{self}: Generating TTS [{text}]")
        try:
            await self.start_ttfb_metrics()
            await self.start_tts_usage_metrics(text)
            yield TTSStartedFrame()
            async for snippet in self.hume_client.tts.synthesize_json_streaming(
              utterances = [
                PostedUtterance(
                    voice=PostedUtteranceVoiceWithId(
                        id="6b558cbd-2b9e-4c53-8179-c1aeffcf9da1"
                    ),
                    text=text
                )
              ],
              format=FormatPcm(type="pcm"),
              num_generations=1,
            ):
              await self.stop_ttfb_metrics()
              yield TTSAudioRawFrame(audio=resample_pcm(base64.b64decode(snippet.audio), 48000, self.sample_rate), sample_rate=self.sample_rate, num_channels=1)
            yield TTSStoppedFrame()
        except Exception as e:
            logger.error(f"{self}: Error generating TTS: {e}")
            yield ErrorFrame(f"Error getting audio: {str(e)}")