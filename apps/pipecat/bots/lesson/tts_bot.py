import asyncio
import datetime
import io
import wave
import aiofiles
from typing import Any, AsyncGenerator, List, Tuple
import os
import json
from pipecat.frames.frames import EndFrame, TTSSpeakFrame,TTSTextFrame,  TTSStartedFrame, Frame, TTSAudioRawFrame, TTSStoppedFrame, TransportMessageUrgentFrame, StartFrame, CancelFrame
from bots.http.frame_serializer import BotFrameSerializer
from bots.persistent_context import PersistentContext
from common.publisher import PublisherFactory
from bots.rtvi import create_rtvi_processor
from bots.types import BotConfig, BotParams
from common.config import SERVICE_API_KEYS
from common.models import Attachment, Message
from common.publisher import default_publisher_factory
from fastapi import HTTPException, status
from loguru import logger
from openai._types import NOT_GIVEN
from pipecat.services.deepseek.llm import DeepSeekLLMService
from sqlalchemy.ext.asyncio import AsyncSession

from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from bots.minimax.tts import MiniMaxHttpTTSService
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.async_generator import AsyncGeneratorProcessor
from pipecat.transcriptions.language import Language
from pipecat.processors.frameworks.rtvi import (
    RTVIActionRun,
    RTVIMessage,
    RTVIProcessor,
    RTVIObserver
)
from pipecat.services.ai_services import OpenAILLMContext
from pipecat.services.google import GoogleLLMContext, GoogleLLMService
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.elevenlabs.tts import ElevenLabsHttpTTSService
import aiohttp

os.makedirs("recordings", exist_ok=True)


async def save_audio(audio: bytes, sample_rate: int, num_channels: int, name: str):
    if len(audio) > 0:
        filename = os.path.join(
            "recordings",
            f"{name}_conversation_recording.wav",
        )
        with io.BytesIO() as buffer:
            with wave.open(buffer, "wb") as wf:
                wf.setsampwidth(2)
                wf.setnchannels(num_channels)
                wf.setframerate(sample_rate)
                wf.writeframes(audio)
            async with aiofiles.open(filename, "wb") as file:
                await file.write(buffer.getvalue())
        print(f"Merged audio saved to {filename}")
    else:
        print("No audio data to save")


class AudioBufferProcessor(FrameProcessor):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._params = kwargs.get("params")
        self._audio_buffer = []
        self._word_timestamps_buffer = []
        self._sample_rate = 24000
        self._num_channels = 1
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, TTSStartedFrame):
            self._audio_buffer = []
            self._word_timestamps_buffer = []
        elif isinstance(frame, TTSAudioRawFrame):
            self._audio_buffer.append(frame.audio)
        elif isinstance(frame, TTSTextFrame):
            # TTSTextFrame#44(pts: 0:00:01.817739, text: [l])
            self._word_timestamps_buffer.append({
                'text': frame.text,
                'start_time': frame.pts
            })
        elif isinstance(frame, EndFrame) or isinstance(frame, TTSStoppedFrame):
            if self._audio_buffer:
                await save_audio(
                    b"".join(self._audio_buffer),
                    self._sample_rate,
                    self._num_channels,
                    f"tts_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
                )
                await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'server-message', 'data': {'fileUrl': f"tts_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}", 'word_timestamps': self._word_timestamps_buffer, 'userId': self._params.user_id }}), direction)
                default_publisher_factory = PublisherFactory()
                print(f"self._word_timestamps_buffer: {self._params.actions[0].data}")
                payload = {
                    "pattern": "document",
                    "data": {
                        "content": self._params.actions[0].data['arguments'][0]['value'],
                        "fileUrl": f"tts_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        "wordTimestamps": self._word_timestamps_buffer,
                        "userId": self._params.user_id
                    }
                }
                default_publisher_factory.publish(json.dumps(payload))
                await self.push_frame(EndFrame(), direction)
                await self.push_frame(TTSStoppedFrame(), direction)
                # await self.push_frame(CancelFrame(), direction)
        await self.push_frame(frame, direction)




async def lesson_tts_bot_pipeline(
    params: BotParams,
    config: BotConfig,
    session: aiohttp.ClientSession = None,
) -> Tuple[AsyncGenerator[Any, None], Any]:

    async_generator = AsyncGeneratorProcessor(serializer=BotFrameSerializer())
    rtvi = await create_rtvi_processor(config, user_aggregator=None)
    if session is None:
        session = aiohttp.ClientSession()
    try:
        # tts = ElevenLabsHttpTTSService(
        #     api_key=os.getenv("ELEVENLABS_API_KEY", ""),
        #     voice_id=params.voice_id,
        #     aiohttp_session=session
        # )
        tts = CartesiaTTSService(
            api_key=os.getenv("CARTESIA_API_KEY"), 
            model="sonic-turbo-2025-03-07", 
            voice_id="f786b574-daa5-4673-aa0c-cbe3e8534c02",
            # params=CartesiaTTSService.InputParams(
            #     speed=0.8,
            # )
        )
        audiobuffer = AudioBufferProcessor(params=params)
        processors = [
            rtvi,
            tts,
            audiobuffer,
            async_generator,
        ]

        pipeline = Pipeline(processors)

        runner = PipelineRunner(handle_sigint=False)

        task = PipelineTask(pipeline, observers=[RTVIObserver(rtvi)])

        runner_task = asyncio.create_task(runner.run(task))

        @rtvi.event_handler("on_bot_started")
        async def on_bot_started(rtvi: RTVIProcessor):
            # await task.queue_frames([StartFrame()])
            for action in params.actions:
                logger.debug(f"Processing action: {action}")
                await rtvi.handle_message(action)
                await tts.start(StartFrame())

            action = RTVIActionRun(service="system", action="end")
            message = RTVIMessage(type="action", id="END", data=action.model_dump())
            await rtvi.handle_message(message)
            
    finally:
        if session is None:
            await session.close()

    return (async_generator.generator(), runner_task)
