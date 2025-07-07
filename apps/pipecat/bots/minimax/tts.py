#
# Copyright (c) 2024–2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""MiniMax text-to-speech service implementation.

This module provides integration with MiniMax's T2A (Text-to-Audio) API
for streaming text-to-speech synthesis.
"""

import json
from typing import AsyncGenerator, Optional

import aiohttp
from loguru import logger
from pydantic import BaseModel

from pipecat.processors.frame_processor import FrameDirection

from pipecat.frames.frames import (
    ErrorFrame,
    Frame,
    TransportMessageUrgentFrame,
    StartFrame,
    TTSAudioRawFrame,
    TTSStartedFrame,
    EndFrame,
    TTSStoppedFrame,
    StartInterruptionFrame,
    CancelFrame,
    TransportMessageUrgentFrame,
    TTSUpdateSettingsFrame
)

from pipecat.services.tts_service import (
    TTSService, 
    WordTTSService,
    AudioContextWordTTSService,
)

from pipecat.transcriptions.language import Language
from pipecat.utils.tracing.service_decorators import traced_tts

import ssl
import websockets
from io import BytesIO
import asyncio
import re


def language_to_minimax_language(language: Language) -> Optional[str]:
    """Convert a Language enum to MiniMax language format.

    Args:
        language: The Language enum value to convert.

    Returns:
        The corresponding MiniMax language name, or None if not supported.
    """
    BASE_LANGUAGES = {
        Language.AR: "Arabic",
        Language.CS: "Czech",
        Language.DE: "German",
        Language.EL: "Greek",
        Language.EN: "English",
        Language.ES: "Spanish",
        Language.FI: "Finnish",
        Language.FR: "French",
        Language.HI: "Hindi",
        Language.ID: "Indonesian",
        Language.IT: "Italian",
        Language.JA: "Japanese",
        Language.KO: "Korean",
        Language.NL: "Dutch",
        Language.PL: "Polish",
        Language.PT: "Portuguese",
        Language.RO: "Romanian",
        Language.RU: "Russian",
        Language.TH: "Thai",
        Language.TR: "Turkish",
        Language.UK: "Ukrainian",
        Language.VI: "Vietnamese",
        Language.YUE: "Chinese,Yue",
        Language.ZH: "Chinese",
    }

    result = BASE_LANGUAGES.get(language)

    # If not found in base languages, try to find the base language from a variant
    if not result:
        # Convert enum value to string and get the base language part (e.g. es-ES -> es)
        lang_str = str(language.value)
        base_code = lang_str.split("-")[0].lower()
        # Find matching language
        for code, name in BASE_LANGUAGES.items():
            if str(code.value).lower().startswith(base_code):
                result = name
                break

    return result


class MiniMaxHttpTTSService(TTSService):
    """Text-to-speech service using MiniMax's T2A (Text-to-Audio) API.

    Provides streaming text-to-speech synthesis using MiniMax's HTTP API
    with support for various voice settings, emotions, and audio configurations.
    Supports real-time audio streaming with configurable voice parameters.

    Platform documentation:
    https://www.minimax.io/platform/document/T2A%20V2?key=66719005a427f0c8a5701643
    """

    class InputParams(BaseModel):
        """Configuration parameters for MiniMax TTS.

        Parameters:
            language: Language for TTS generation.
            speed: Speech speed (range: 0.5 to 2.0).
            volume: Speech volume (range: 0 to 10).
            pitch: Pitch adjustment (range: -12 to 12).
            emotion: Emotional tone (options: "happy", "sad", "angry", "fearful",
                "disgusted", "surprised", "neutral").
            english_normalization: Whether to apply English text normalization.
        """

        language: Optional[Language] = Language.ZH
        speed: Optional[float] = 1.1
        volume: Optional[float] = 1.0
        pitch: Optional[float] = 0
        emotion: Optional[str] = None
        english_normalization: Optional[bool] = None

    def __init__(
        self,
        *,
        api_key: str,
        group_id: str,
        model: str = "speech-02-turbo",
        voice_id: str = "Calm_Woman",
        aiohttp_session: Optional[aiohttp.ClientSession] = None,
        sample_rate: Optional[int] = None,
        params: Optional[InputParams] = None,
        **kwargs,
    ):
        """Initialize the MiniMax TTS service.

        Args:
            api_key: MiniMax API key for authentication.
            group_id: MiniMax Group ID to identify project.
            model: TTS model name. Defaults to "speech-02-turbo". Options include
                "speech-02-hd", "speech-02-turbo", "speech-01-hd", "speech-01-turbo".
            voice_id: Voice identifier. Defaults to "Calm_Woman".
            aiohttp_session: aiohttp.ClientSession for API communication. If None, a new session will be created.
            sample_rate: Output audio sample rate in Hz. If None, uses pipeline default.
            params: Additional configuration parameters.
            **kwargs: Additional arguments passed to parent TTSService.
        """
        super().__init__(sample_rate=sample_rate, **kwargs)

        params = params or MiniMaxHttpTTSService.InputParams()
        self._params = params
        self._api_key = api_key
        self._group_id = group_id
        self._base_url = f"https://api.minimax.chat/v1/t2a_v2?Groupid={group_id}"
        if aiohttp_session is None:
            import aiohttp
            self._session = aiohttp.ClientSession()
        else:
            self._session = aiohttp_session
        self._model_name = model
        self._voice_id = voice_id

        # Create voice settings
        self._settings = {
            "stream": True,
            "voice_setting": {
                "speed": params.speed,
                "vol": params.volume,
                "pitch": params.pitch,
            },
            "audio_setting": {
                "bitrate": 128000,
                "format": "pcm",
                "channel": 1,
            },
        }

        # Set voice and model
        self.set_voice(voice_id)
        self.set_model_name(model)

        # Add language boost if provided
        if params.language:
            service_lang = self.language_to_service_language(params.language)
            if service_lang:
                self._settings["language_boost"] = service_lang

        # Add optional emotion if provided
        if params.emotion:
            # Validate emotion is in the supported list
            supported_emotions = [
                "happy",
                "sad",
                "angry",
                "fearful",
                "disgusted",
                "surprised",
                "neutral",
            ]
            if params.emotion in supported_emotions:
                self._settings["voice_setting"]["emotion"] = params.emotion
            else:
                logger.warning(f"Unsupported emotion: {params.emotion}. Using default.")

        # Add english_normalization if provided
        if params.english_normalization is not None:
            self._settings["english_normalization"] = params.english_normalization

    def can_generate_metrics(self) -> bool:
        """Check if this service can generate processing metrics.

        Returns:
            True, as MiniMax service supports metrics generation.
        """
        return True

    def language_to_service_language(self, language: Language) -> Optional[str]:
        """Convert a Language enum to MiniMax service language format.

        Args:
            language: The language to convert.

        Returns:
            The MiniMax-specific language name, or None if not supported.
        """
        return language_to_minimax_language(language)

    def set_model_name(self, model: str):
        """Set the TTS model to use.

        Args:
            model: The model name to use for synthesis.
        """
        self._model_name = model

    def set_voice(self, voice: str):
        """Set the voice to use.

        Args:
            voice: The voice identifier to use for synthesis.
        """
        self._voice_id = voice
        if "voice_setting" in self._settings:
            self._settings["voice_setting"]["voice_id"] = voice

    async def start(self, frame: StartFrame):
        """Start the MiniMax TTS service.

        Args:
            frame: The start frame containing initialization parameters.
        """
        await super().start(frame)
        self._settings["audio_setting"]["sample_rate"] = self.sample_rate
        logger.debug(f"MiniMax TTS initialized with sample rate: {self.sample_rate}")

    @staticmethod
    def extract_emotion_from_text(text: str) -> (str, str):
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
        """Generate TTS audio from text using MiniMax's streaming API.

        Args:
            text: The text to synthesize into speech.

        Yields:
            Frame: Audio frames containing the synthesized speech.
        """
        logger.debug(f"{self}: Generating TTS [{text}]")

        # 新增：自动提取情感标签
        emotion, clean_text = self.extract_emotion_from_text(text)
        if emotion:
            # 只在检测到标签时临时覆盖
            self._settings["voice_setting"]["emotion"] = emotion
            text = clean_text
            await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'server-message', 'data': {'emotion': emotion}}))
            await self.push_frame(TTSUpdateSettingsFrame(settings={"emotion": [emotion]}))
        else:
            # 恢复为params中的默认值
            self._settings["voice_setting"]["emotion"] = getattr(self._params, "emotion", "neutral") or "neutral"

        headers = {
            "accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._api_key}",
        }

        # Create payload from settings
        payload = self._settings.copy()
        payload["model"] = self._model_name
        payload["text"] = text

        try:
            await self.start_ttfb_metrics()

            async with self._session.post(
                self._base_url, headers=headers, json=payload
            ) as response:
                if response.status != 200:
                    error_message = f"MiniMax TTS error: HTTP {response.status}"
                    logger.error(error_message)
                    yield ErrorFrame(error=error_message)
                    return

                await self.start_tts_usage_metrics(text)
                yield TTSStartedFrame()

                # Process the streaming response
                buffer = bytearray()
                CHUNK_SIZE = 1024

                async for chunk in response.content.iter_chunked(CHUNK_SIZE):
                    if not chunk:
                        continue

                    buffer.extend(chunk)

                    # Find complete data blocks
                    while b"data:" in buffer:
                        start = buffer.find(b"data:")
                        next_start = buffer.find(b"data:", start + 5)

                        if next_start == -1:
                            # No next data block found, keep current data for next iteration
                            if start > 0:
                                buffer = buffer[start:]
                            break

                        # Extract a complete data block
                        data_block = buffer[start:next_start]
                        buffer = buffer[next_start:]

                        try:
                            data = json.loads(data_block[5:].decode("utf-8"))
                            # Skip data blocks containing extra_info
                            if "extra_info" in data:
                                logger.debug("Received final chunk with extra info")
                                continue

                            chunk_data = data.get("data", {})
                            if not chunk_data:
                                continue

                            audio_data = chunk_data.get("audio")
                            if not audio_data:
                                continue

                            # Process audio data in chunks
                            for i in range(0, len(audio_data), CHUNK_SIZE * 2):  # *2 for hex string
                                # Split hex string
                                hex_chunk = audio_data[i : i + CHUNK_SIZE * 2]
                                if not hex_chunk:
                                    continue

                                try:
                                    # Convert this chunk of data
                                    audio_chunk = bytes.fromhex(hex_chunk)
                                    if audio_chunk:
                                        await self.stop_ttfb_metrics()
                                        yield TTSAudioRawFrame(
                                            audio=audio_chunk,
                                            sample_rate=self._settings["audio_setting"][
                                                "sample_rate"
                                            ],
                                            num_channels=self._settings["audio_setting"]["channel"],
                                        )
                                except ValueError as e:
                                    logger.error(f"Error converting hex to binary: {e}")
                                    continue

                        except json.JSONDecodeError as e:
                            logger.error(f"Error decoding JSON: {e}, data: {data_block[:100]}")
                            continue

        
        except Exception as e:
            logger.exception(f"Error generating TTS: {e}")
            yield ErrorFrame(error=f"MiniMax TTS error: {str(e)}")
        finally:
            await self.stop_ttfb_metrics()
            yield TTSStoppedFrame()


class MiniMaxTTSService(WordTTSService):
    """基于 MiniMax WebSocket 的 TTS 服务实现，支持连接复用，风格对齐 ElevenLabsTTSService。"""
    class InputParams(MiniMaxHttpTTSService.InputParams):
        pass

    def __init__(
        self,
        *,
        api_key: str,
        group_id: str,
        model: str = "speech-02-turbo",
        voice_id: str = "Calm_Woman",
        sample_rate: int = 32000,
        params: Optional[MiniMaxHttpTTSService.InputParams] = None,
        **kwargs,
    ):
        super().__init__(sample_rate=sample_rate, **kwargs)
        params = params or MiniMaxTTSService.InputParams()
        self._api_key = api_key
        self._group_id = group_id
        self._model_name = model
        self._voice_id = voice_id
        self._sample_rate = sample_rate
        self._params = params
        self._settings = {
            "voice_setting": {
                "voice_id": voice_id,
                "speed": params.speed,
                "vol": params.volume,
                "pitch": params.pitch,
                "emotion": params.emotion or "neutral",
            },
            "audio_setting": {
                "sample_rate": sample_rate,
                "bitrate": 128000,
                "format": "pcm",
                "channel": 1,
            },
        }
        if params.language:
            lang = self.language_to_service_language(params.language)
            if lang:
                self._settings["language_boost"] = lang
        if params.english_normalization is not None:
            self._settings["english_normalization"] = params.english_normalization
        self._websocket = None
        self._ssl_context = ssl.create_default_context()
        self._ssl_context.check_hostname = False
        self._ssl_context.verify_mode = ssl.CERT_NONE
        self._url = "wss://api.minimaxi.com/ws/v1/t2a_v2"
        self._lock = asyncio.Lock()  # 保证串行
        self._current_settings = (model, voice_id, sample_rate, json.dumps(self._settings, sort_keys=True))

        self._started = False  # 标记是否已发送 task_start
        self._context_id = None
        self._request_id = 0
        # self._receive_task = None
        self._keepalive_task = None

    def language_to_service_language(self, language: Language) -> Optional[str]:
        return language_to_minimax_language(language)

    def can_generate_metrics(self) -> bool:
        return True

    def set_model_name(self, model: str):
        self._model_name = model

    async def start(self, frame: StartFrame):
        await super().start(frame)
        await self._connect()

    async def stop(self, frame: EndFrame):
        await super().stop(frame)
        await self._disconnect()

    async def cancel(self, frame: CancelFrame):
        await super().cancel(frame)
        await self._disconnect()

    async def flush_audio(self):
        pass

    async def push_frame(self, frame: Frame, direction: FrameDirection = FrameDirection.DOWNSTREAM):
        await super().push_frame(frame, direction)
        if isinstance(frame, (TTSStoppedFrame, StartInterruptionFrame)):
            self._started = False

    async def _disconnect(self):
        # if self._receive_task:
        #     await self.cancel_task(self._receive_task)
        #     self._receive_task = None

        if self._keepalive_task:
            await self.cancel_task(self._keepalive_task)
            self._keepalive_task = None

        await self._disconnect_websocket()

    async def _connect(self):
        await self._connect_websocket()

        # if self._websocket and not self._receive_task:
        #     self._receive_task = self.create_task(self._receive_task_handler(self._report_error))

        if self._websocket and not self._keepalive_task:
            self._keepalive_task = self.create_task(self._keepalive_task_handler())

    def set_voice(self, voice: str):
        self._voice_id = voice
        self._settings["voice_setting"]["voice_id"] = voice

    async def _connect_websocket(self):
        """建立连接，先等待 connected_success，再发送一次 task_start"""
        headers = {"Authorization": f"Bearer {self._api_key}"}
        self._websocket = await websockets.connect(
            self._url, extra_headers=headers, ssl=self._ssl_context
        )
        # 先收到 connected_success
        response = json.loads(await self._websocket.recv())
        if response.get("event") != "connected_success":
            await self._websocket.close()
            self._websocket = None
            self._started = False
            raise Exception(f"MiniMaxTTSService: 连接失败: {response}")
        self._context_id = response.get("session_id")
        # 再发送 task_start
        start_msg = {
            "event": "task_start",
            "model": self._model_name,
            **self._settings,
        }
        await self._websocket.send(json.dumps(start_msg))
        response = json.loads(await self._websocket.recv())
        if response.get("event") != "task_started":
            await self._websocket.close()
            self._websocket = None
            self._started = False
            raise Exception(f"MiniMaxTTSService: 任务启动失败: {response}")
        self._started = True
        # await self.create_audio_context(self._context_id)
        self._current_settings = (
            self._model_name,
            self._voice_id,
            self._sample_rate,
            json.dumps(self._settings, sort_keys=True),
        )
        logger.debug(f"MiniMaxTTSService: 连接成功, context_id: {self._context_id}")

    async def _disconnect_websocket(self):
        try:
            if self._websocket:
                try:
                    await self._websocket.send(json.dumps({"event": "task_finish"}))
                except Exception:
                    pass
                await self._websocket.close()
        except Exception as e:
            logger.warning(f"MiniMaxTTSService: 关闭连接异常: {e}")
        finally:
            self._websocket = None
            self._started = False

    async def _ensure_connection(self):
        # 检查参数是否变更，变更则重连
        settings_tuple = (
            self._model_name,
            self._voice_id,
            self._sample_rate,
            json.dumps(self._settings, sort_keys=True),
        )
        if (
            not self._websocket
            or self._websocket.closed
            or not self._started
            or settings_tuple != self._current_settings
        ):
            await self._disconnect_websocket()
            await self._connect_websocket()

    def split_sentences(self, text: str):
        """
        按中英文标点和换行拆分句子，保留标点。
        """
        # 用正则直接分割并保留标点
        pattern = r'[^。！？!?\n\r]+[。！？!?]?'  # 匹配非标点和换行的内容，后跟可选标点
        sentences = re.findall(pattern, text.replace('\r', '\n'))
        # 过滤空句
        return [s.strip() for s in sentences if s.strip()]

    def _reset_state(self):
        """Reset internal state variables."""
        self._cumulative_time = 0
        self._started = False
        self._previous_text = ""
        logger.debug(f"{self}: Reset internal state")

    async def _handle_interruption(self, frame: StartInterruptionFrame, direction: FrameDirection):
        await super()._handle_interruption(frame, direction)
        # Close the current context when interrupted without closing the websocket
        if self._context_id and self._websocket:
            logger.trace(f"Closing context {self._context_id} due to interruption")
            try:
               # TODO
               self._request_id += 1  # 递增，标记新一轮请求
            except Exception as e:
                logger.error(f"Error closing context on interruption: {e}")
            # self._context_id = None
            # self._started = False

    async def _receive_messages(self):
        pass

    async def _keepalive_task_handler(self):

        while True:
            await asyncio.sleep(10)
            try:
                # Send an empty message to keep the connection alive
                if self._websocket and self._websocket.open:
                    await self._websocket.send(json.dumps({}))
            except websockets.ConnectionClosed as e:
                logger.warning(f"{self} keepalive error: {e}")
                break 
   

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
        async with self._lock:
            try:
                self._request_id += 1
                current_id = self._request_id   
                await self._ensure_connection()
                emotion, clean_text = self.extract_emotion_from_text(text)
                if emotion:
                    # 只在检测到标签时临时覆盖
                    self._settings["voice_setting"]["emotion"] = emotion
                    text = clean_text
                    await self.push_frame(TransportMessageUrgentFrame(message={'label': 'rtvi-ai', 'type': 'server-message', 'data': {'emotion': emotion}}))
                    await self.push_frame(TTSUpdateSettingsFrame(settings={"emotion": [emotion]}))
                else:
                    # 恢复为params中的默认值
                    self._settings["voice_setting"]["emotion"] = getattr(self._params, "emotion", "neutral") or "neutral"
                await self.start_ttfb_metrics()
                await self.start_tts_usage_metrics(text)
                yield TTSStartedFrame()
                await self._websocket.send(json.dumps({"event": "task_continue", "text": text}))
                while True:
                    resp = json.loads(await self._websocket.recv())
                    if current_id != self._request_id:
                        break
                    if "data" in resp and "audio" in resp["data"]:
                        audio_hex = resp["data"]["audio"]
                        try:
                            audio_bytes = bytes.fromhex(audio_hex)
                            await self.stop_ttfb_metrics()
                            yield TTSAudioRawFrame(
                                audio=audio_bytes,
                                sample_rate=self._sample_rate,
                                num_channels=1,
                            )
                        except Exception as e:
                            logger.error(f"MiniMaxTTSService: 音频解码失败: {e}")
                    if resp.get("is_final"):
                        break
            except Exception as e:
                logger.exception(f"MiniMaxTTSService: 生成 TTS 失败: {e}")
                yield ErrorFrame(error=f"MiniMaxTTSService: {str(e)}")
            finally:
                await self.stop_ttfb_metrics()
                yield TTSStoppedFrame()