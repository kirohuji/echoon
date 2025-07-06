import asyncio
import base64
import datetime
import os
from dotenv import load_dotenv
from hume.client import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions
from hume.empathic_voice.chat.types import SubscribeEvent
from hume import MicrophoneInterface, Stream


class WebSocketHandler:
    def __init__(self):
        self.byte_strs = Stream.new()

    async def on_open(self):
        print("WebSocket connection opened.")

    async def on_message(self, message: SubscribeEvent):
        if message.type == "chat_metadata":
            self._print_prompt(f"<{message.type}> Chat ID: {message.chat_id}, Chat Group ID: {message.chat_group_id}")
            return
        elif message.type == "user_message" or message.type == "assistant_message":
            self._print_prompt(f"{message.message.role}: {message.message.content}")
            if message.models.prosody is not None:
                self._print_emotion_scores(
                    self._extract_top_n_emotions(dict(message.models.prosody.scores), 3)
                )
            else:
                print("Emotion scores not available.")
            return
        elif message.type == "audio_output":
            await self.byte_strs.put(
                base64.b64decode(message.data.encode("utf-8"))
            )
            return
        elif message.type == "error":
            raise RuntimeError(f"Received error message from Hume websocket ({message.code}): {message.message}")
        else:
            self._print_prompt(f"<{message.type}>")

        
    async def on_close(self):
        print("WebSocket connection closed.")

    async def on_error(self, error):
        print(f"Error: {error}")

    def _print_prompt(self, text: str) -> None:
        now = datetime.datetime.now(tz=datetime.timezone.utc).strftime("%H:%M:%S")
        print(f"[{now}] {text}")

    def _extract_top_n_emotions(self, emotion_scores: dict, n: int) -> dict:
        sorted_emotions = sorted(emotion_scores.items(), key=lambda item: item[1], reverse=True)
        top_n_emotions = {emotion: score for emotion, score in sorted_emotions[:n]}

        return top_n_emotions

    def _print_emotion_scores(self, emotion_scores: dict) -> None:
        print(
            ' | '.join([f"{emotion} ({score:.2f})" for emotion, score in emotion_scores.items()])
        )


class HumeLLMService(LLMService):
    def __init__(self, api_key: str, secret_key: str, config_id: str, base_url: str, **kwargs):
        super().__init__(base_url=base_url, **kwargs)
        self.api_key = api_key
        self.secret_key = secret_key
        self.config_id = config_id
        self.hume_client = AsyncHumeClient(api_key=self.api_key)
        self.options = ChatConnectOptions(config_id=self.config_id, secret_key=self.secret_key)

    async def _connect(self):
        self.websocket_handler = WebSocketHandler()
        # 初始化时建立 websocket 连接
        self.socket = await self.hume_client.expression_measurement.stream.connect(
            options=self.options
            on_open=self.websocket_handler.on_open,
        on_message=websocket_handler.on_message,
        on_close=websocket_handler.on_close,
        on_error=websocket_handler.on_error
        ).__aenter__()


    async def run_llm(self, messages: list[Message]) -> AsyncGenerator[Frame, None]:
        pass